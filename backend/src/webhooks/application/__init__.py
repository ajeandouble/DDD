import hashlib
import hmac
import json
import traceback
from typing import Callable
from uuid import UUID

import warnings

import httpx
from RestrictedPython import PrintCollector, compile_restricted, safe_builtins, safe_globals

from src.conversations.domain.events import ConversationTranscribed
from src.shared.events import subscribe
from src.webhooks.domain import Delivery, DeliveryStatus, WebhookEndpoint
from src.webhooks.domain.repositories import DeliveryRepository, WebhookEndpointRepository

EVENT_CONVERSATION_TRANSCRIBED = "conversation.transcribed"


def run_transformer(code: str, payload: dict) -> tuple[dict | None, str | None, str]:
    """Run the user transformer in a RestrictedPython sandbox.
    Returns (result_dict, error_string, stdout). error is None on success."""
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            compiled = compile_restricted(code, "<transformer>", "exec")
    except SyntaxError:
        return None, traceback.format_exc(), ""

    globs = {
        **safe_globals,
        "__builtins__": safe_builtins,
        "json": json,
        "_getiter_": iter,
        "_getattr_": getattr,
        "_getitem_": lambda obj, key: obj[key],
        "_write_": lambda x: x,
        "_print_": PrintCollector,
    }
    locs: dict = {"payload": payload}

    try:
        exec(compiled, globs, locs)  # noqa: S102
    except Exception:
        stdout = locs["_print"]() if "_print" in locs else ""
        return None, traceback.format_exc(), stdout

    stdout = locs["_print"]() if "_print" in locs else ""
    result = locs.get("result")
    if not isinstance(result, dict):
        return (
            None,
            f"Transformer must assign a dict to `result`, got {type(result).__name__}",
            stdout,
        )

    return result, None, stdout


def _sign(secret: str, body: bytes) -> str:
    return "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


async def _deliver(ep: WebhookEndpoint, event_type: str, payload: dict) -> Delivery:
    delivery = Delivery.create(endpoint_id=ep.id, event_type=event_type, payload_sent={})

    result, error, _ = run_transformer(ep.transformer, payload)
    if error:
        delivery.status = DeliveryStatus.TRANSFORMER_ERROR
        delivery.error = error
        return delivery

    body = json.dumps(result).encode()
    delivery.payload_sent = result

    headers = {"Content-Type": "application/json", "X-DDD-Event": event_type}
    if ep.secret:
        headers["X-DDD-Signature"] = _sign(ep.secret, body)

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(ep.url, content=body, headers=headers)
        delivery.response_code = resp.status_code
        if resp.is_success:
            delivery.status = DeliveryStatus.SUCCESS
        else:
            delivery.status = DeliveryStatus.FAILED
            delivery.error = f"HTTP {resp.status_code}: {resp.text[:500]}"
    except Exception:
        delivery.status = DeliveryStatus.FAILED
        delivery.error = traceback.format_exc()

    return delivery


def register_handlers(
    ep_repo_factory: Callable[[], WebhookEndpointRepository],
    del_repo_factory: Callable[[], DeliveryRepository],
) -> None:
    async def on_conversation_transcribed(event: ConversationTranscribed) -> None:
        ep_repo = ep_repo_factory()
        del_repo = del_repo_factory()

        endpoints = await ep_repo.find_enabled_for_event(EVENT_CONVERSATION_TRANSCRIBED)
        if not endpoints:
            return

        payload = {
            "event": EVENT_CONVERSATION_TRANSCRIBED,
            "conversation_id": str(event.conversation_id),
            "org_id": str(event.org_id),
            "title": event.title,
            "conversation_timestamp": event.conversation_timestamp,
            "scope_type": event.scope_type,
            "scope_id": str(event.scope_id) if event.scope_id else None,
            "metadata": event.metadata,
            "content": event.speaker_turns,
            "stats": event.stats,
        }

        event_scope_id = UUID(payload["scope_id"]) if payload.get("scope_id") else None
        for ep in endpoints:
            if not ep.matches_scope(payload.get("scope_type"), event_scope_id):
                continue
            delivery = await _deliver(ep, EVENT_CONVERSATION_TRANSCRIBED, payload)
            await del_repo.save(delivery)
            print(
                f"[webhooks] endpoint={ep.id} status={delivery.status} code={delivery.response_code}"
            )

    subscribe(ConversationTranscribed, on_conversation_transcribed)
