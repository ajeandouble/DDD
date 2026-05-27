import { r as __toESM } from "./chunk-CYJPkc-J.js";
import { t as require_react } from "./react.js";
import { t as require_react_dom } from "./react-dom-0R_uKCUX.js";
//#region node_modules/@mantine/hooks/esm/utils/clamp/clamp.mjs
function clamp(value, min, max) {
	if (min === void 0 && max === void 0) return value;
	if (min !== void 0 && max === void 0) return Math.max(value, min);
	if (min === void 0 && max !== void 0) return Math.min(value, max);
	return Math.min(Math.max(value, min), max);
}
//#endregion
//#region node_modules/@mantine/hooks/esm/utils/lower-first/lower-first.mjs
function lowerFirst(value) {
	return typeof value !== "string" ? "" : value.charAt(0).toLowerCase() + value.slice(1);
}
//#endregion
//#region node_modules/@mantine/hooks/esm/utils/random-id/random-id.mjs
function randomId(prefix = "mantine-") {
	return `${prefix}${Math.random().toString(36).slice(2, 11)}`;
}
//#endregion
//#region node_modules/@mantine/hooks/esm/utils/range/range.mjs
function range$1(start, end) {
	const length = Math.abs(end - start) + 1;
	if (!(start > end)) return Array.from({ length }, (_, index) => index + start);
	return Array.from({ length }, (_, index) => start - index);
}
//#endregion
//#region node_modules/@mantine/hooks/esm/utils/shallow-equal/shallow-equal.mjs
function shallowEqual(a, b) {
	if (a === b) return true;
	if (Number.isNaN(a) && Number.isNaN(b)) return true;
	if (!(a instanceof Object) || !(b instanceof Object)) return false;
	const keys = Object.keys(a);
	const { length } = keys;
	if (length !== Object.keys(b).length) return false;
	for (let i = 0; i < length; i += 1) {
		const key = keys[i];
		if (!(key in b)) return false;
		if (a[key] !== b[key] && !(Number.isNaN(a[key]) && Number.isNaN(b[key]))) return false;
	}
	return true;
}
//#endregion
//#region node_modules/@mantine/hooks/esm/utils/upper-first/upper-first.mjs
function upperFirst(value) {
	return typeof value !== "string" ? "" : value.charAt(0).toUpperCase() + value.slice(1);
}
//#endregion
//#region node_modules/@mantine/hooks/esm/utils/use-callback-ref/use-callback-ref.mjs
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
function useCallbackRef(callback) {
	const callbackRef = (0, import_react.useRef)(callback);
	(0, import_react.useEffect)(() => {
		callbackRef.current = callback;
	});
	return (0, import_react.useMemo)(() => ((...args) => callbackRef.current?.(...args)), []);
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-debounced-callback/use-debounced-callback.mjs
function useDebouncedCallback(callback, options) {
	const { delay, flushOnUnmount, leading, maxWait } = typeof options === "number" ? {
		delay: options,
		flushOnUnmount: false,
		leading: false,
		maxWait: void 0
	} : options;
	const handleCallback = useCallbackRef(callback);
	const debounceTimerRef = (0, import_react.useRef)(0);
	const maxWaitTimerRef = (0, import_react.useRef)(0);
	const latestArgsRef = (0, import_react.useRef)(null);
	const lastCallback = (0, import_react.useMemo)(() => {
		const currentCallback = Object.assign((...args) => {
			window.clearTimeout(debounceTimerRef.current);
			latestArgsRef.current = args;
			const isFirstCall = currentCallback._isFirstCall;
			currentCallback._isFirstCall = false;
			function clearTimeoutAndLeadingRef() {
				window.clearTimeout(debounceTimerRef.current);
				window.clearTimeout(maxWaitTimerRef.current);
				debounceTimerRef.current = 0;
				maxWaitTimerRef.current = 0;
				currentCallback._isFirstCall = true;
				currentCallback._hasPendingCallback = false;
			}
			function startMaxWaitTimer() {
				if (maxWait !== void 0 && maxWaitTimerRef.current === 0) maxWaitTimerRef.current = window.setTimeout(() => {
					if (debounceTimerRef.current !== 0) {
						const latestArgs = latestArgsRef.current;
						clearTimeoutAndLeadingRef();
						handleCallback(...latestArgs);
					}
				}, maxWait);
			}
			if (leading && isFirstCall) {
				handleCallback(...args);
				const resetLeadingState = () => {
					clearTimeoutAndLeadingRef();
				};
				const flush = () => {
					if (debounceTimerRef.current !== 0) {
						clearTimeoutAndLeadingRef();
						handleCallback(...args);
					}
				};
				const cancel = () => {
					clearTimeoutAndLeadingRef();
				};
				currentCallback.flush = flush;
				currentCallback.cancel = cancel;
				debounceTimerRef.current = window.setTimeout(resetLeadingState, delay);
				startMaxWaitTimer();
				return;
			}
			if (leading && !isFirstCall) {
				currentCallback._hasPendingCallback = true;
				const flush = () => {
					if (debounceTimerRef.current !== 0) {
						clearTimeoutAndLeadingRef();
						handleCallback(...args);
					}
				};
				const cancel = () => {
					clearTimeoutAndLeadingRef();
				};
				currentCallback.flush = flush;
				currentCallback.cancel = cancel;
				const resetLeadingState = () => {
					clearTimeoutAndLeadingRef();
				};
				debounceTimerRef.current = window.setTimeout(resetLeadingState, delay);
				startMaxWaitTimer();
				return;
			}
			currentCallback._hasPendingCallback = true;
			const flush = () => {
				if (debounceTimerRef.current !== 0) {
					clearTimeoutAndLeadingRef();
					handleCallback(...args);
				}
			};
			const cancel = () => {
				clearTimeoutAndLeadingRef();
			};
			currentCallback.flush = flush;
			currentCallback.cancel = cancel;
			debounceTimerRef.current = window.setTimeout(flush, delay);
			startMaxWaitTimer();
		}, {
			flush: () => {},
			cancel: () => {},
			isPending: () => currentCallback._hasPendingCallback,
			_isFirstCall: true,
			_hasPendingCallback: false
		});
		return currentCallback;
	}, [
		handleCallback,
		delay,
		leading,
		maxWait
	]);
	(0, import_react.useEffect)(() => () => {
		if (flushOnUnmount) lastCallback.flush();
		else lastCallback.cancel();
	}, [lastCallback, flushOnUnmount]);
	return lastCallback;
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-click-outside/use-click-outside.mjs
var DEFAULT_EVENTS = ["mousedown", "touchstart"];
function useClickOutside(callback, events, nodes, enabled = true) {
	const ref = (0, import_react.useRef)(null);
	const eventsList = events || DEFAULT_EVENTS;
	const listener = (0, import_react.useEffectEvent)((event) => {
		const { target } = event ?? {};
		if (!document.body.contains(target) && target?.tagName !== "HTML") return;
		const path = event.composedPath();
		if (Array.isArray(nodes)) nodes.every((node) => !!node && !path.includes(node)) && callback(event);
		else if (ref.current && !path.includes(ref.current)) callback(event);
	});
	const eventsKey = eventsList.join(",");
	(0, import_react.useEffect)(() => {
		if (!enabled) return;
		const events = eventsKey.split(",");
		events.forEach((fn) => document.addEventListener(fn, listener));
		return () => {
			events.forEach((fn) => document.removeEventListener(fn, listener));
		};
	}, [eventsKey, enabled]);
	return ref;
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-clipboard/use-clipboard.mjs
function useClipboard(options = {}) {
	const timeout = options.timeout ?? 2e3;
	const [error, setError] = (0, import_react.useState)(null);
	const [copied, setCopied] = (0, import_react.useState)(false);
	const timeoutRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => () => {
		window.clearTimeout(timeoutRef.current);
	}, []);
	const handleCopyResult = (value) => {
		window.clearTimeout(timeoutRef.current);
		timeoutRef.current = window.setTimeout(() => setCopied(false), timeout);
		setCopied(value);
	};
	const copy = (value) => {
		if ("clipboard" in navigator) navigator.clipboard.writeText(value).then(() => {
			setError(null);
			handleCopyResult(true);
		}).catch((err) => setError(err));
		else setError(/* @__PURE__ */ new Error("useClipboard: navigator.clipboard is not supported"));
	};
	const reset = () => {
		setCopied(false);
		setError(null);
		window.clearTimeout(timeoutRef.current);
	};
	return {
		copy,
		reset,
		error,
		copied
	};
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-media-query/use-media-query.mjs
function getInitialValue$1(query, initialValue) {
	if (typeof initialValue === "boolean") return initialValue;
	if (typeof window !== "undefined" && "matchMedia" in window) return window.matchMedia(query).matches;
	return false;
}
function useMediaQuery(query, initialValue, { getInitialValueInEffect } = { getInitialValueInEffect: true }) {
	const [matches, setMatches] = (0, import_react.useState)(getInitialValueInEffect ? initialValue : getInitialValue$1(query));
	(0, import_react.useEffect)(() => {
		try {
			if ("matchMedia" in window) {
				const mediaQuery = window.matchMedia(query);
				setMatches(mediaQuery.matches);
				const callback = (event) => setMatches(event.matches);
				mediaQuery.addEventListener("change", callback);
				return () => {
					mediaQuery.removeEventListener("change", callback);
				};
			}
		} catch (e) {
			return;
		}
	}, [query]);
	return matches || false;
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-color-scheme/use-color-scheme.mjs
function useColorScheme(initialValue, options) {
	return useMediaQuery("(prefers-color-scheme: dark)", initialValue === "dark", options) ? "dark" : "light";
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-counter/use-counter.mjs
var DEFAULT_OPTIONS$1 = {
	min: -Infinity,
	max: Infinity
};
function useCounter(initialValue = 0, options) {
	const { min, max, step: _step = 1 } = {
		...DEFAULT_OPTIONS$1,
		...options
	};
	const step = Math.abs(_step);
	const [count, setCount] = (0, import_react.useState)(clamp(initialValue, min, max));
	return [count, {
		increment: (0, import_react.useCallback)(() => setCount((current) => clamp(current + step, min, max)), [
			min,
			max,
			step
		]),
		decrement: (0, import_react.useCallback)(() => setCount((current) => clamp(current - step, min, max)), [
			min,
			max,
			step
		]),
		set: (0, import_react.useCallback)((value) => setCount(clamp(value, min, max)), [min, max]),
		reset: (0, import_react.useCallback)(() => setCount(clamp(initialValue, min, max)), [
			initialValue,
			min,
			max
		])
	}];
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-debounced-state/use-debounced-state.mjs
function useDebouncedState(defaultValue, wait, options = { leading: false }) {
	const [value, setValue] = (0, import_react.useState)(defaultValue);
	const timeoutRef = (0, import_react.useRef)(null);
	const leadingRef = (0, import_react.useRef)(true);
	const clearTimeout = () => window.clearTimeout(timeoutRef.current);
	(0, import_react.useEffect)(() => clearTimeout, []);
	return [value, (0, import_react.useCallback)((newValue) => {
		clearTimeout();
		if (leadingRef.current && options.leading) setValue(newValue);
		else timeoutRef.current = window.setTimeout(() => {
			leadingRef.current = true;
			setValue(newValue);
		}, wait);
		leadingRef.current = false;
	}, [options.leading, wait])];
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-debounced-value/use-debounced-value.mjs
function useDebouncedValue(value, wait, options = { leading: false }) {
	const [_value, setValue] = (0, import_react.useState)(value);
	const mountedRef = (0, import_react.useRef)(false);
	const timeoutRef = (0, import_react.useRef)(null);
	const cooldownRef = (0, import_react.useRef)(false);
	const latestValueRef = (0, import_react.useRef)(value);
	latestValueRef.current = value;
	const cancel = (0, import_react.useCallback)(() => {
		window.clearTimeout(timeoutRef.current);
		timeoutRef.current = null;
		cooldownRef.current = false;
	}, []);
	const flush = (0, import_react.useCallback)(() => {
		if (timeoutRef.current) {
			cancel();
			cooldownRef.current = false;
			setValue(latestValueRef.current);
		}
	}, []);
	(0, import_react.useEffect)(() => {
		if (mountedRef.current) if (!cooldownRef.current && options.leading) {
			cooldownRef.current = true;
			setValue(value);
			timeoutRef.current = window.setTimeout(() => {
				cooldownRef.current = false;
			}, wait);
		} else {
			cancel();
			timeoutRef.current = window.setTimeout(() => {
				cooldownRef.current = false;
				setValue(value);
			}, wait);
		}
	}, [
		value,
		options.leading,
		wait
	]);
	(0, import_react.useEffect)(() => {
		mountedRef.current = true;
		return cancel;
	}, []);
	return [
		_value,
		cancel,
		{
			cancel,
			flush
		}
	];
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-isomorphic-effect/use-isomorphic-effect.mjs
var useIsomorphicEffect = typeof document !== "undefined" ? import_react.useLayoutEffect : import_react.useEffect;
//#endregion
//#region node_modules/@mantine/hooks/esm/use-document-title/use-document-title.mjs
function useDocumentTitle(title) {
	useIsomorphicEffect(() => {
		if (typeof title === "string" && title.trim().length > 0) document.title = title.trim();
	}, [title]);
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-document-visibility/use-document-visibility.mjs
function useDocumentVisibility() {
	const [documentVisibility, setDocumentVisibility] = (0, import_react.useState)("visible");
	(0, import_react.useEffect)(() => {
		setDocumentVisibility(document.visibilityState);
		const listener = () => setDocumentVisibility(document.visibilityState);
		document.addEventListener("visibilitychange", listener);
		return () => document.removeEventListener("visibilitychange", listener);
	}, []);
	return documentVisibility;
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-did-update/use-did-update.mjs
function useDidUpdate(fn, dependencies) {
	const mounted = (0, import_react.useRef)(false);
	(0, import_react.useEffect)(() => () => {
		mounted.current = false;
	}, []);
	(0, import_react.useEffect)(() => {
		if (mounted.current) return fn();
		mounted.current = true;
	}, dependencies);
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-focus-return/use-focus-return.mjs
function useFocusReturn({ opened, shouldReturnFocus = true }) {
	const lastActiveElement = (0, import_react.useRef)(null);
	const returnFocus = () => {
		if (lastActiveElement.current && "focus" in lastActiveElement.current && typeof lastActiveElement.current.focus === "function") lastActiveElement.current?.focus({ preventScroll: true });
	};
	useDidUpdate(() => {
		let timeout = -1;
		const clearFocusTimeout = (event) => {
			if (event.key === "Tab") window.clearTimeout(timeout);
		};
		document.addEventListener("keydown", clearFocusTimeout);
		if (opened) lastActiveElement.current = document.activeElement;
		else if (shouldReturnFocus) {
			const activeElementAtClose = document.activeElement;
			timeout = window.setTimeout(() => {
				const currentActiveElement = document.activeElement;
				if (currentActiveElement === null || currentActiveElement === document.body || currentActiveElement === activeElementAtClose) returnFocus();
			}, 10);
		}
		return () => {
			window.clearTimeout(timeout);
			document.removeEventListener("keydown", clearFocusTimeout);
		};
	}, [opened, shouldReturnFocus]);
	return returnFocus;
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-focus-trap/tabbable.mjs
var TABBABLE_NODES = /input|select|textarea|button|object/;
var FOCUS_SELECTOR = "a, input, select, textarea, button, object, [tabindex]";
function hidden(element) {
	return element.style.display === "none";
}
function visible(element) {
	if (element.getAttribute("aria-hidden") || element.getAttribute("hidden") || element.getAttribute("type") === "hidden") return false;
	let parentElement = element;
	while (parentElement) {
		if (parentElement === document.body || parentElement.nodeType === 11) break;
		if (hidden(parentElement)) return false;
		parentElement = parentElement.parentNode;
	}
	return true;
}
function getElementTabIndex(element) {
	let tabIndex = element.getAttribute("tabindex");
	if (tabIndex === null) tabIndex = void 0;
	return parseInt(tabIndex, 10);
}
function focusable(element) {
	const nodeName = element.nodeName.toLowerCase();
	const isTabIndexNotNaN = !Number.isNaN(getElementTabIndex(element));
	return (TABBABLE_NODES.test(nodeName) && !element.disabled || (element instanceof HTMLAnchorElement ? element.href || isTabIndexNotNaN : isTabIndexNotNaN)) && visible(element);
}
function tabbable(element) {
	const tabIndex = getElementTabIndex(element);
	return (Number.isNaN(tabIndex) || tabIndex >= 0) && focusable(element);
}
function findTabbableDescendants(element) {
	return Array.from(element.querySelectorAll(FOCUS_SELECTOR)).filter(tabbable);
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-focus-trap/scope-tab.mjs
function scopeTab(node, event) {
	const tabbable = findTabbableDescendants(node);
	if (!tabbable.length) {
		event.preventDefault();
		return;
	}
	const finalTabbable = tabbable[event.shiftKey ? 0 : tabbable.length - 1];
	const root = node.getRootNode();
	let leavingFinalTabbable = finalTabbable === root.activeElement || node === root.activeElement;
	const activeElement = root.activeElement;
	if (activeElement.tagName === "INPUT" && activeElement.getAttribute("type") === "radio") leavingFinalTabbable = tabbable.filter((element) => element.getAttribute("type") === "radio" && element.getAttribute("name") === activeElement.getAttribute("name")).includes(finalTabbable);
	if (!leavingFinalTabbable) return;
	event.preventDefault();
	const target = tabbable[event.shiftKey ? tabbable.length - 1 : 0];
	if (target) target.focus();
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-focus-trap/use-focus-trap.mjs
function useFocusTrap(active = true) {
	const ref = (0, import_react.useRef)(null);
	const focusNode = (node) => {
		let focusElement = node.querySelector("[data-autofocus]");
		if (!focusElement) {
			const children = Array.from(node.querySelectorAll(FOCUS_SELECTOR));
			focusElement = children.find(tabbable) || children.find(focusable) || null;
			if (!focusElement && focusable(node)) focusElement = node;
		}
		if (focusElement) focusElement.focus({ preventScroll: true });
		else console.warn("[@mantine/hooks/use-focus-trap] Failed to find focusable element within provided node", node);
	};
	const setRef = (0, import_react.useCallback)((node) => {
		if (!active) return;
		if (node === null) {
			ref.current = null;
			return;
		}
		if (ref.current === node) return;
		setTimeout(() => {
			if (node.getRootNode()) focusNode(node);
			else console.warn("[@mantine/hooks/use-focus-trap] Ref node is not part of the dom", node);
		});
		ref.current = node;
	}, [active]);
	(0, import_react.useEffect)(() => {
		if (!active) return;
		if (ref.current) setTimeout(() => {
			if (ref.current) focusNode(ref.current);
		});
		const handleKeyDown = (event) => {
			if (event.key === "Tab" && ref.current) scopeTab(ref.current, event);
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [active]);
	return setRef;
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-force-update/use-force-update.mjs
var reducer = (value) => (value + 1) % 1e6;
function useForceUpdate() {
	const [, update] = (0, import_react.useReducer)(reducer, 0);
	return update;
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-id/use-id.mjs
function useId$1(staticId) {
	const [uuid, setUuid] = (0, import_react.useState)(`mantine-${(0, import_react.useId)().replace(/:/g, "")}`);
	useIsomorphicEffect(() => {
		setUuid(randomId());
	}, []);
	if (typeof staticId === "string") return staticId;
	return uuid;
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-idle/use-idle.mjs
var DEFAULT_OPTIONS = {
	events: [
		"keydown",
		"mousemove",
		"touchmove",
		"click",
		"scroll",
		"wheel"
	],
	initialState: true
};
function useIdle(timeout, options) {
	const { events, initialState } = {
		...DEFAULT_OPTIONS,
		...options
	};
	const [idle, setIdle] = (0, import_react.useState)(initialState);
	const timer = (0, import_react.useRef)(-1);
	(0, import_react.useEffect)(() => {
		const handleEvents = () => {
			setIdle(false);
			if (timer.current) window.clearTimeout(timer.current);
			timer.current = window.setTimeout(() => {
				setIdle(true);
			}, timeout);
		};
		events.forEach((event) => document.addEventListener(event, handleEvents));
		timer.current = window.setTimeout(() => {
			setIdle(true);
		}, timeout);
		return () => {
			events.forEach((event) => document.removeEventListener(event, handleEvents));
			window.clearTimeout(timer.current);
			timer.current = -1;
		};
	}, [timeout]);
	return idle;
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-interval/use-interval.mjs
function useInterval(fn, interval, { autoInvoke = false } = {}) {
	const [active, setActive] = (0, import_react.useState)(false);
	const intervalRef = (0, import_react.useRef)(null);
	const fnRef = (0, import_react.useRef)(null);
	const intervalValueRef = (0, import_react.useRef)(interval);
	intervalValueRef.current = interval;
	const start = (0, import_react.useCallback)(() => {
		setActive((old) => {
			if (!old && !intervalRef.current) intervalRef.current = window.setInterval(fnRef.current, intervalValueRef.current);
			return true;
		});
	}, []);
	const stop = (0, import_react.useCallback)(() => {
		setActive(false);
		if (intervalRef.current) window.clearInterval(intervalRef.current);
		intervalRef.current = null;
	}, []);
	const toggle = (0, import_react.useCallback)(() => {
		setActive((current) => {
			if (current) {
				if (intervalRef.current) window.clearInterval(intervalRef.current);
				intervalRef.current = null;
				return false;
			}
			if (!intervalRef.current) intervalRef.current = window.setInterval(fnRef.current, intervalValueRef.current);
			return true;
		});
	}, []);
	(0, import_react.useEffect)(() => {
		fnRef.current = fn;
		active && start();
		return stop;
	}, [
		fn,
		active,
		interval
	]);
	(0, import_react.useEffect)(() => {
		if (autoInvoke) start();
	}, []);
	return {
		start,
		stop,
		toggle,
		active
	};
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-list-state/use-list-state.mjs
function useListState(initialValue = []) {
	const [state, setState] = (0, import_react.useState)(initialValue);
	const append = (0, import_react.useCallback)((...items) => setState((current) => [...current, ...items]), []);
	const prepend = (0, import_react.useCallback)((...items) => setState((current) => [...items, ...current]), []);
	const insert = (0, import_react.useCallback)((index, ...items) => setState((current) => [
		...current.slice(0, index),
		...items,
		...current.slice(index)
	]), []);
	const apply = (0, import_react.useCallback)((fn) => setState((current) => current.map((item, index) => fn(item, index))), []);
	const remove = (0, import_react.useCallback)((...indices) => setState((current) => current.filter((_, index) => !indices.includes(index))), []);
	const pop = (0, import_react.useCallback)(() => setState((current) => {
		const cloned = [...current];
		cloned.pop();
		return cloned;
	}), []);
	const shift = (0, import_react.useCallback)(() => setState((current) => {
		const cloned = [...current];
		cloned.shift();
		return cloned;
	}), []);
	const reorder = (0, import_react.useCallback)(({ from, to }) => setState((current) => {
		const cloned = [...current];
		const item = current[from];
		cloned.splice(from, 1);
		cloned.splice(to, 0, item);
		return cloned;
	}), []);
	const swap = (0, import_react.useCallback)(({ from, to }) => setState((current) => {
		const cloned = [...current];
		const fromItem = cloned[from];
		const toItem = cloned[to];
		cloned.splice(to, 1, fromItem);
		cloned.splice(from, 1, toItem);
		return cloned;
	}), []);
	const setItem = (0, import_react.useCallback)((index, item) => setState((current) => {
		const cloned = [...current];
		cloned[index] = item;
		return cloned;
	}), []);
	const setItemProp = (0, import_react.useCallback)((index, prop, value) => setState((current) => {
		const cloned = [...current];
		cloned[index] = {
			...cloned[index],
			[prop]: value
		};
		return cloned;
	}), []);
	const applyWhere = (0, import_react.useCallback)((condition, fn) => setState((current) => current.map((item, index) => condition(item, index) ? fn(item, index) : item)), []);
	const filter = (0, import_react.useCallback)((fn) => {
		setState((current) => current.filter(fn));
	}, []);
	return [state, (0, import_react.useMemo)(() => ({
		setState,
		append,
		prepend,
		insert,
		pop,
		shift,
		apply,
		applyWhere,
		remove,
		reorder,
		swap,
		setItem,
		setItemProp,
		filter
	}), [])];
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-window-event/use-window-event.mjs
function useWindowEvent(type, listener, options) {
	const stableListener = (0, import_react.useEffectEvent)(listener);
	(0, import_react.useEffect)(() => {
		window.addEventListener(type, stableListener, options);
		return () => window.removeEventListener(type, stableListener, options);
	}, [type]);
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-local-storage/create-storage.mjs
function serializeJSON(value, hookName = "use-local-storage") {
	try {
		return JSON.stringify(value);
	} catch (error) {
		throw new Error(`@mantine/hooks ${hookName}: Failed to serialize the value`);
	}
}
function deserializeJSON(value) {
	try {
		return value && JSON.parse(value);
	} catch {
		return value;
	}
}
function createStorageHandler(type) {
	const getItem = (key) => {
		try {
			return window[type].getItem(key);
		} catch (error) {
			console.warn("use-local-storage: Failed to get value from storage, localStorage is blocked");
			return null;
		}
	};
	const setItem = (key, value) => {
		try {
			window[type].setItem(key, value);
		} catch (error) {
			console.warn("use-local-storage: Failed to set value to storage, localStorage is blocked");
		}
	};
	const removeItem = (key) => {
		try {
			window[type].removeItem(key);
		} catch (error) {
			console.warn("use-local-storage: Failed to remove value from storage, localStorage is blocked");
		}
	};
	return {
		getItem,
		setItem,
		removeItem
	};
}
function createStorage(type, hookName) {
	const eventName = type === "localStorage" ? "mantine-local-storage" : "mantine-session-storage";
	const { getItem, setItem, removeItem } = createStorageHandler(type);
	return function useStorage({ key, defaultValue, getInitialValueInEffect = true, sync = true, deserialize = deserializeJSON, serialize = (value) => serializeJSON(value, hookName) }) {
		const readStorageValue = (0, import_react.useCallback)((skipStorage) => {
			let storageBlockedOrSkipped;
			try {
				storageBlockedOrSkipped = typeof window === "undefined" || !(type in window) || window[type] === null || !!skipStorage;
			} catch (_e) {
				storageBlockedOrSkipped = true;
			}
			if (storageBlockedOrSkipped) return defaultValue;
			const storageValue = getItem(key);
			return storageValue !== null ? deserialize(storageValue) : defaultValue;
		}, [key, defaultValue]);
		const [value, setValue] = (0, import_react.useState)(readStorageValue(getInitialValueInEffect));
		const setStorageValue = (0, import_react.useCallback)((val) => {
			if (val instanceof Function) setValue((current) => {
				const result = val(current);
				setItem(key, serialize(result));
				queueMicrotask(() => {
					window.dispatchEvent(new CustomEvent(eventName, { detail: {
						key,
						value: result
					} }));
				});
				return result;
			});
			else {
				setItem(key, serialize(val));
				window.dispatchEvent(new CustomEvent(eventName, { detail: {
					key,
					value: val
				} }));
				setValue(val);
			}
		}, [key]);
		const removeStorageValue = (0, import_react.useCallback)(() => {
			removeItem(key);
			setValue(defaultValue);
			window.dispatchEvent(new CustomEvent(eventName, { detail: {
				key,
				value: defaultValue
			} }));
		}, [key, defaultValue]);
		useWindowEvent("storage", (event) => {
			if (sync) {
				if (event.storageArea === window[type] && event.key === key) setValue(deserialize(event.newValue ?? void 0));
			}
		});
		useWindowEvent(eventName, (event) => {
			if (sync) {
				if (event.detail.key === key) setValue(event.detail.value);
			}
		});
		(0, import_react.useEffect)(() => {
			if (defaultValue !== void 0 && value === void 0) setStorageValue(defaultValue);
		}, [
			defaultValue,
			value,
			setStorageValue
		]);
		(0, import_react.useEffect)(() => {
			const val = readStorageValue();
			val !== void 0 && setStorageValue(val);
		}, [key]);
		return [
			value === void 0 ? defaultValue : value,
			setStorageValue,
			removeStorageValue
		];
	};
}
function readValue(type) {
	const { getItem } = createStorageHandler(type);
	return function read({ key, defaultValue, deserialize = deserializeJSON }) {
		let storageBlockedOrSkipped;
		try {
			storageBlockedOrSkipped = typeof window === "undefined" || !(type in window) || window[type] === null;
		} catch (_e) {
			storageBlockedOrSkipped = true;
		}
		if (storageBlockedOrSkipped) return defaultValue;
		const storageValue = getItem(key);
		return storageValue !== null ? deserialize(storageValue) : defaultValue;
	};
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-local-storage/use-local-storage.mjs
function useLocalStorage(props) {
	return createStorage("localStorage", "use-local-storage")(props);
}
var readLocalStorageValue = readValue("localStorage");
//#endregion
//#region node_modules/@mantine/hooks/esm/use-session-storage/use-session-storage.mjs
function useSessionStorage(props) {
	return createStorage("sessionStorage", "use-session-storage")(props);
}
var readSessionStorageValue = readValue("sessionStorage");
//#endregion
//#region node_modules/@mantine/hooks/esm/use-merged-ref/use-merged-ref.mjs
function assignRef(ref, value) {
	if (typeof ref === "function") return ref(value);
	else if (typeof ref === "object" && ref !== null && "current" in ref) ref.current = value;
}
function mergeRefs(...refs) {
	const cleanupMap = /* @__PURE__ */ new Map();
	return (node) => {
		refs.forEach((ref) => {
			const cleanup = assignRef(ref, node);
			if (cleanup) cleanupMap.set(ref, cleanup);
		});
		if (cleanupMap.size > 0) return () => {
			refs.forEach((ref) => {
				const cleanup = cleanupMap.get(ref);
				if (cleanup && typeof cleanup === "function") cleanup();
				else assignRef(ref, null);
			});
			cleanupMap.clear();
		};
	};
}
function useMergedRef(...refs) {
	return (0, import_react.useCallback)(mergeRefs(...refs), refs);
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-mouse/use-mouse.mjs
function useMouse(options = { resetOnExit: false }) {
	const [position, setPosition] = (0, import_react.useState)({
		x: 0,
		y: 0
	});
	return {
		ref: (0, import_react.useCallback)((node) => {
			const setMousePosition = (event) => {
				const mouseEvent = event;
				if (node) {
					const rect = node.getBoundingClientRect();
					setPosition({
						x: Math.max(0, Math.round(mouseEvent.clientX - rect.left)),
						y: Math.max(0, Math.round(mouseEvent.clientY - rect.top))
					});
				} else setPosition({
					x: mouseEvent.clientX,
					y: mouseEvent.clientY
				});
			};
			const resetMousePosition = () => setPosition({
				x: 0,
				y: 0
			});
			node?.addEventListener("mousemove", setMousePosition);
			if (options.resetOnExit) node?.addEventListener("mouseleave", resetMousePosition);
			return () => {
				node?.removeEventListener("mousemove", setMousePosition);
				if (options.resetOnExit) node?.removeEventListener("mouseleave", resetMousePosition);
			};
		}, [options.resetOnExit]),
		...position
	};
}
function useMousePosition() {
	const [position, setPosition] = (0, import_react.useState)({
		x: 0,
		y: 0
	});
	(0, import_react.useEffect)(() => {
		const setMousePosition = (event) => {
			setPosition({
				x: event.clientX,
				y: event.clientY
			});
		};
		document.addEventListener("mousemove", setMousePosition);
		return () => {
			document.removeEventListener("mousemove", setMousePosition);
		};
	}, []);
	return position;
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-move/use-move.mjs
function clampUseMovePosition(position) {
	return {
		x: clamp(position.x, 0, 1),
		y: clamp(position.y, 0, 1)
	};
}
function useMove(onChange, handlers, dir = "ltr") {
	const mounted = (0, import_react.useRef)(false);
	const isSliding = (0, import_react.useRef)(false);
	const frame = (0, import_react.useRef)(0);
	const cleanupRef = (0, import_react.useRef)(null);
	const [active, setActive] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		mounted.current = true;
		return () => {
			cleanupRef.current?.();
		};
	}, []);
	return {
		ref: (0, import_react.useCallback)((node) => {
			const onScrub = ({ x, y }) => {
				cancelAnimationFrame(frame.current);
				frame.current = requestAnimationFrame(() => {
					if (mounted.current && node) {
						node.style.userSelect = "none";
						const rect = node.getBoundingClientRect();
						if (rect.width && rect.height) {
							const _x = clamp((x - rect.left) / rect.width, 0, 1);
							onChange({
								x: dir === "ltr" ? _x : 1 - _x,
								y: clamp((y - rect.top) / rect.height, 0, 1)
							});
						}
					}
				});
			};
			const bindEvents = () => {
				document.addEventListener("mousemove", onMouseMove);
				document.addEventListener("mouseup", stopScrubbing);
				document.addEventListener("touchmove", onTouchMove, { passive: false });
				document.addEventListener("touchend", stopScrubbing);
			};
			const unbindEvents = () => {
				document.removeEventListener("mousemove", onMouseMove);
				document.removeEventListener("mouseup", stopScrubbing);
				document.removeEventListener("touchmove", onTouchMove);
				document.removeEventListener("touchend", stopScrubbing);
			};
			const startScrubbing = () => {
				if (!isSliding.current && mounted.current) {
					isSliding.current = true;
					typeof handlers?.onScrubStart === "function" && handlers.onScrubStart();
					setActive(true);
					bindEvents();
				}
			};
			const stopScrubbing = () => {
				if (isSliding.current && mounted.current) {
					isSliding.current = false;
					setActive(false);
					unbindEvents();
					setTimeout(() => {
						typeof handlers?.onScrubEnd === "function" && handlers.onScrubEnd();
					}, 0);
				}
			};
			const onMouseDown = (event) => {
				startScrubbing();
				event.preventDefault();
				onMouseMove(event);
			};
			const onMouseMove = (event) => onScrub({
				x: event.clientX,
				y: event.clientY
			});
			const onTouchStart = (event) => {
				if (event.cancelable) event.preventDefault();
				startScrubbing();
				onTouchMove(event);
			};
			const onTouchMove = (event) => {
				if (event.cancelable) event.preventDefault();
				onScrub({
					x: event.changedTouches[0].clientX,
					y: event.changedTouches[0].clientY
				});
			};
			node?.addEventListener("mousedown", onMouseDown);
			node?.addEventListener("touchstart", onTouchStart, { passive: false });
			cleanupRef.current = () => {
				unbindEvents();
				cancelAnimationFrame(frame.current);
			};
			return () => {
				if (node) {
					node.removeEventListener("mousedown", onMouseDown);
					node.removeEventListener("touchstart", onTouchStart);
				}
			};
		}, [dir, onChange]),
		active
	};
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-uncontrolled/use-uncontrolled.mjs
function useUncontrolled({ value, defaultValue, finalValue, onChange = () => {} }) {
	const [uncontrolledValue, setUncontrolledValue] = (0, import_react.useState)(defaultValue !== void 0 ? defaultValue : finalValue);
	const handleUncontrolledChange = (val, ...payload) => {
		setUncontrolledValue(val);
		onChange?.(val, ...payload);
	};
	if (value !== void 0) return [
		value,
		onChange,
		true
	];
	return [
		uncontrolledValue,
		handleUncontrolledChange,
		false
	];
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-pagination/use-pagination.mjs
function range(start, end) {
	const length = end - start + 1;
	return Array.from({ length }, (_, index) => index + start);
}
var DOTS = "dots";
function usePagination({ total, siblings = 1, boundaries = 1, page, initialPage, onChange, startValue = 1 }) {
	const _startValue = Math.max(Math.trunc(startValue), 1);
	const _endValue = Math.max(Math.trunc(total), _startValue);
	const _total = _endValue - _startValue + 1;
	const _initialPage = initialPage ?? _startValue;
	const [activePage, setActivePage] = useUncontrolled({
		value: page,
		onChange,
		defaultValue: _initialPage,
		finalValue: _initialPage
	});
	const setPage = (0, import_react.useCallback)((pageNumber) => {
		if (pageNumber < _startValue) setActivePage(_startValue);
		else if (pageNumber > _endValue) setActivePage(_endValue);
		else setActivePage(pageNumber);
	}, [
		_startValue,
		_endValue,
		setActivePage
	]);
	const next = (0, import_react.useCallback)(() => setPage(activePage + 1), [activePage, setPage]);
	const previous = (0, import_react.useCallback)(() => setPage(activePage - 1), [activePage, setPage]);
	const first = (0, import_react.useCallback)(() => setPage(_startValue), [setPage, _startValue]);
	const last = (0, import_react.useCallback)(() => setPage(_endValue), [_endValue, setPage]);
	return {
		range: (0, import_react.useMemo)(() => {
			if (siblings * 2 + 3 + boundaries * 2 >= _total) return range(_startValue, _endValue);
			const leftSiblingIndex = Math.max(activePage - siblings, _startValue + boundaries - 1);
			const rightSiblingIndex = Math.min(activePage + siblings, _endValue - boundaries);
			const shouldShowLeftDots = leftSiblingIndex > _startValue + boundaries + 1;
			const shouldShowRightDots = rightSiblingIndex < _endValue - boundaries;
			if (!shouldShowLeftDots && shouldShowRightDots) return [
				...range(_startValue, _startValue + (siblings * 2 + boundaries + 2) - 1),
				DOTS,
				...range(_endValue - (boundaries - 1), _endValue)
			];
			if (shouldShowLeftDots && !shouldShowRightDots) {
				const rightItemCount = boundaries + 1 + 2 * siblings;
				return [
					...range(_startValue, _startValue + boundaries - 1),
					DOTS,
					...range(_endValue - rightItemCount, _endValue)
				];
			}
			return [
				...range(_startValue, _startValue + boundaries - 1),
				DOTS,
				...range(leftSiblingIndex, rightSiblingIndex),
				DOTS,
				...range(_endValue - boundaries + 1, _endValue)
			];
		}, [
			_total,
			siblings,
			activePage,
			_startValue,
			_endValue,
			boundaries
		]),
		active: activePage,
		setPage,
		next,
		previous,
		first,
		last
	};
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-queue/use-queue.mjs
function useQueue({ initialValues = [], limit }) {
	const [state, setState] = (0, import_react.useState)({
		state: initialValues.slice(0, limit),
		queue: initialValues.slice(limit)
	});
	const add = (...items) => setState((current) => {
		const results = [
			...current.state,
			...current.queue,
			...items
		];
		return {
			state: results.slice(0, limit),
			queue: results.slice(limit)
		};
	});
	const update = (fn) => setState((current) => {
		const results = fn([...current.state, ...current.queue]);
		return {
			state: results.slice(0, limit),
			queue: results.slice(limit)
		};
	});
	const cleanQueue = () => setState((current) => ({
		state: current.state,
		queue: []
	}));
	return {
		state: state.state,
		queue: state.queue,
		add,
		update,
		cleanQueue
	};
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-page-leave/use-page-leave.mjs
function usePageLeave(onPageLeave) {
	const onPageLeaveEvent = (0, import_react.useEffectEvent)(onPageLeave);
	(0, import_react.useEffect)(() => {
		document.documentElement.addEventListener("mouseleave", onPageLeaveEvent);
		return () => document.documentElement.removeEventListener("mouseleave", onPageLeaveEvent);
	}, []);
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-reduced-motion/use-reduced-motion.mjs
function useReducedMotion(initialValue, options) {
	return useMediaQuery("(prefers-reduced-motion: reduce)", initialValue, options);
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-scroll-into-view/use-scroll-into-view.mjs
function useScrollIntoView({ duration = 1250, axis = "y", onScrollFinish, onScrollCancel, easing = easeInOutQuad, offset = 0, cancelable = true, isList = false } = {}) {
	const frameID = (0, import_react.useRef)(0);
	const startTime = (0, import_react.useRef)(0);
	const shouldStop = (0, import_react.useRef)(false);
	const [scrolling, setScrolling] = (0, import_react.useState)(false);
	const scrollableRef = (0, import_react.useRef)(null);
	const targetRef = (0, import_react.useRef)(null);
	const reducedMotion = useReducedMotion();
	const cancel = () => {
		if (frameID.current) {
			cancelAnimationFrame(frameID.current);
			frameID.current = 0;
			setScrolling(false);
		}
	};
	const scrollIntoView = (0, import_react.useCallback)(({ alignment = "start" } = {}) => {
		shouldStop.current = false;
		if (frameID.current) cancel();
		const start = getScrollStart({
			parent: scrollableRef.current,
			axis
		}) ?? 0;
		const change = getRelativePosition({
			parent: scrollableRef.current,
			target: targetRef.current,
			axis,
			alignment,
			offset,
			isList
		}) - (scrollableRef.current ? 0 : start);
		setScrolling(true);
		function animateScroll() {
			if (startTime.current === 0) startTime.current = performance.now();
			const elapsed = performance.now() - startTime.current;
			const t = reducedMotion || duration === 0 ? 1 : elapsed / duration;
			const distance = start + change * easing(t);
			setScrollParam({
				parent: scrollableRef.current,
				axis,
				distance
			});
			if (!shouldStop.current && t < 1) frameID.current = requestAnimationFrame(animateScroll);
			else {
				if (shouldStop.current) typeof onScrollCancel === "function" && onScrollCancel();
				else typeof onScrollFinish === "function" && onScrollFinish();
				startTime.current = 0;
				frameID.current = 0;
				setScrolling(false);
				cancel();
			}
		}
		animateScroll();
	}, [
		axis,
		duration,
		easing,
		isList,
		offset,
		onScrollFinish,
		onScrollCancel,
		reducedMotion
	]);
	const handleStop = () => {
		if (cancelable) shouldStop.current = true;
	};
	/**
	* Detection of one of these events stops scroll animation
	* wheel - mouse wheel / touch pad
	* touchmove - any touchable device
	*/
	useWindowEvent("wheel", handleStop, { passive: true });
	useWindowEvent("touchmove", handleStop, { passive: true });
	(0, import_react.useEffect)(() => cancel, []);
	return {
		scrollableRef,
		targetRef,
		scrollIntoView,
		cancel,
		scrolling
	};
}
function easeInOutQuad(t) {
	return t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
function getRelativePosition({ axis, target, parent, alignment, offset, isList }) {
	if (!target || !parent && typeof document === "undefined") return 0;
	const isCustomParent = !!parent;
	const parentPosition = (parent || document.body).getBoundingClientRect();
	const targetPosition = target.getBoundingClientRect();
	const getDiff = (property) => targetPosition[property] - parentPosition[property];
	if (axis === "y") {
		const diff = getDiff("top");
		if (diff === 0) return 0;
		if (alignment === "start") {
			const distance = diff - offset;
			return distance <= targetPosition.height * (isList ? 0 : 1) || !isList ? distance : 0;
		}
		const parentHeight = isCustomParent ? parentPosition.height : window.innerHeight;
		if (alignment === "end") {
			const distance = diff + offset - parentHeight + targetPosition.height;
			return distance >= -targetPosition.height * (isList ? 0 : 1) || !isList ? distance : 0;
		}
		if (alignment === "center") return diff - parentHeight / 2 + targetPosition.height / 2;
		return 0;
	}
	if (axis === "x") {
		const diff = getDiff("left");
		if (diff === 0) return 0;
		if (alignment === "start") {
			const distance = diff - offset;
			return distance <= targetPosition.width || !isList ? distance : 0;
		}
		const parentWidth = isCustomParent ? parentPosition.width : window.innerWidth;
		if (alignment === "end") {
			const distance = diff + offset - parentWidth + targetPosition.width;
			return distance >= -targetPosition.width || !isList ? distance : 0;
		}
		if (alignment === "center") return diff - parentWidth / 2 + targetPosition.width / 2;
		return 0;
	}
	return 0;
}
function getScrollStart({ axis, parent }) {
	if (!parent && typeof document === "undefined") return 0;
	const method = axis === "y" ? "scrollTop" : "scrollLeft";
	if (parent) return parent[method];
	const { body, documentElement } = document;
	return body[method] + documentElement[method];
}
function setScrollParam({ axis, parent, distance }) {
	if (!parent && typeof document === "undefined") return;
	const method = axis === "y" ? "scrollTop" : "scrollLeft";
	if (parent) parent[method] = distance;
	else {
		const { body, documentElement } = document;
		body[method] = distance;
		documentElement[method] = distance;
	}
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-resize-observer/use-resize-observer.mjs
var defaultState = {
	x: 0,
	y: 0,
	width: 0,
	height: 0,
	top: 0,
	left: 0,
	bottom: 0,
	right: 0
};
function useResizeObserver(options) {
	const frameID = (0, import_react.useRef)(0);
	const [rect, setRect] = (0, import_react.useState)(defaultState);
	const observerRef = (0, import_react.useRef)(null);
	return [(0, import_react.useCallback)((node) => {
		if (observerRef.current) {
			observerRef.current.disconnect();
			observerRef.current = null;
		}
		if (frameID.current) cancelAnimationFrame(frameID.current);
		if (!node) return;
		observerRef.current = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (entry) {
				cancelAnimationFrame(frameID.current);
				frameID.current = requestAnimationFrame(() => {
					const boxSize = entry.borderBoxSize?.[0] || entry.contentBoxSize?.[0];
					if (boxSize) {
						const width = boxSize.inlineSize;
						const height = boxSize.blockSize;
						setRect({
							width,
							height,
							x: entry.contentRect.x,
							y: entry.contentRect.y,
							top: entry.contentRect.top,
							left: entry.contentRect.left,
							bottom: entry.contentRect.bottom,
							right: entry.contentRect.right
						});
					} else setRect(entry.contentRect);
				});
			}
		});
		observerRef.current.observe(node, options);
	}, [options]), rect];
}
function useElementSize(options) {
	const [ref, { width, height }] = useResizeObserver(options);
	return {
		ref,
		width,
		height
	};
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-shallow-effect/use-shallow-effect.mjs
function shallowCompare(prevValue, currValue) {
	if (!prevValue || !currValue) return false;
	if (prevValue === currValue) return true;
	if (prevValue.length !== currValue.length) return false;
	for (let i = 0; i < prevValue.length; i += 1) if (!shallowEqual(prevValue[i], currValue[i])) return false;
	return true;
}
function useShallowCompare(dependencies) {
	const ref = (0, import_react.useRef)([]);
	const updateRef = (0, import_react.useRef)(0);
	if (!shallowCompare(ref.current, dependencies)) {
		ref.current = dependencies;
		updateRef.current += 1;
	}
	return [updateRef.current];
}
function useShallowEffect(cb, dependencies) {
	(0, import_react.useEffect)(cb, useShallowCompare(dependencies));
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-toggle/use-toggle.mjs
function useToggle(options = [false, true]) {
	const [[option], toggle] = (0, import_react.useReducer)((state, action) => {
		const value = action instanceof Function ? action(state[0]) : action;
		const index = Math.abs(state.indexOf(value));
		return state.slice(index).concat(state.slice(0, index));
	}, options);
	return [option, toggle];
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-viewport-size/use-viewport-size.mjs
var eventListenerOptions = { passive: true };
function useViewportSize() {
	const [windowSize, setWindowSize] = (0, import_react.useState)({
		width: 0,
		height: 0
	});
	const setSize = (0, import_react.useCallback)(() => {
		setWindowSize({
			width: window.innerWidth || 0,
			height: window.innerHeight || 0
		});
	}, []);
	useWindowEvent("resize", setSize, eventListenerOptions);
	useWindowEvent("orientationchange", setSize, eventListenerOptions);
	(0, import_react.useEffect)(setSize, []);
	return windowSize;
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-window-scroll/use-window-scroll.mjs
function getScrollPosition() {
	return typeof window !== "undefined" ? {
		x: window.scrollX,
		y: window.scrollY
	} : {
		x: 0,
		y: 0
	};
}
function scrollTo({ x, y }) {
	if (typeof window !== "undefined") {
		const scrollOptions = { behavior: "smooth" };
		if (typeof x === "number") scrollOptions.left = x;
		if (typeof y === "number") scrollOptions.top = y;
		window.scrollTo(scrollOptions);
	}
}
function useWindowScroll() {
	const [position, setPosition] = (0, import_react.useState)({
		x: 0,
		y: 0
	});
	useWindowEvent("scroll", () => setPosition(getScrollPosition()), { passive: true });
	useWindowEvent("resize", () => setPosition(getScrollPosition()), { passive: true });
	(0, import_react.useEffect)(() => {
		setPosition(getScrollPosition());
	}, []);
	return [position, scrollTo];
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-intersection/use-intersection.mjs
function useIntersection(options) {
	const [entry, setEntry] = (0, import_react.useState)(null);
	const observer = (0, import_react.useRef)(null);
	return {
		ref: (0, import_react.useCallback)((element) => {
			if (observer.current) {
				observer.current.disconnect();
				observer.current = null;
			}
			if (element === null) {
				setEntry(null);
				return;
			}
			observer.current = new IntersectionObserver(([_entry]) => {
				setEntry(_entry);
			}, options);
			observer.current.observe(element);
		}, [
			options?.rootMargin,
			options?.root,
			options?.threshold
		]),
		entry
	};
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-hash/use-hash.mjs
function useHash({ getInitialValueInEffect = true } = {}) {
	const [hash, setHash] = (0, import_react.useState)(getInitialValueInEffect ? "" : window.location.hash || "");
	const setHashHandler = (value) => {
		const valueWithHash = value.startsWith("#") ? value : `#${value}`;
		window.location.hash = valueWithHash;
		setHash(valueWithHash);
	};
	useWindowEvent("hashchange", () => {
		const newHash = window.location.hash;
		if (hash !== newHash) setHash(newHash);
	});
	(0, import_react.useEffect)(() => {
		if (getInitialValueInEffect) setHash(window.location.hash);
	}, []);
	return [hash, setHashHandler];
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-hotkeys/parse-hotkey.mjs
var keyNameMap = {
	" ": "space",
	ArrowLeft: "arrowleft",
	ArrowRight: "arrowright",
	ArrowUp: "arrowup",
	ArrowDown: "arrowdown",
	Escape: "escape",
	Esc: "escape",
	esc: "escape",
	Enter: "enter",
	Tab: "tab",
	Backspace: "backspace",
	Delete: "delete",
	Insert: "insert",
	Home: "home",
	End: "end",
	PageUp: "pageup",
	PageDown: "pagedown",
	"+": "plus",
	"-": "minus",
	"*": "asterisk",
	"/": "slash"
};
function normalizeKey(key) {
	const lowerKey = key.replace("Key", "").toLowerCase();
	return keyNameMap[key] || lowerKey;
}
function parseHotkey(hotkey) {
	const keys = hotkey.toLowerCase().split("+").map((part) => part.trim());
	const modifiers = {
		alt: keys.includes("alt"),
		ctrl: keys.includes("ctrl"),
		meta: keys.includes("meta"),
		mod: keys.includes("mod"),
		shift: keys.includes("shift")
	};
	const reservedKeys = [
		"alt",
		"ctrl",
		"meta",
		"shift",
		"mod"
	];
	const freeKey = keys.find((key) => !reservedKeys.includes(key));
	return {
		...modifiers,
		key: freeKey === "[plus]" ? "+" : freeKey
	};
}
function isExactHotkey(hotkey, event, usePhysicalKeys) {
	const { alt, ctrl, meta, mod, shift, key } = hotkey;
	const { altKey, ctrlKey, metaKey, shiftKey, key: pressedKey, code: pressedCode } = event;
	if (alt !== altKey) return false;
	if (mod) {
		if (!ctrlKey && !metaKey) return false;
	} else {
		if (ctrl !== ctrlKey) return false;
		if (meta !== metaKey) return false;
	}
	if (shift !== shiftKey) return false;
	if (key && (usePhysicalKeys ? normalizeKey(pressedCode) === normalizeKey(key) : normalizeKey(pressedKey ?? pressedCode) === normalizeKey(key))) return true;
	return false;
}
function getHotkeyMatcher(hotkey, usePhysicalKeys) {
	return (event) => isExactHotkey(parseHotkey(hotkey), event, usePhysicalKeys);
}
function getHotkeyHandler(hotkeys) {
	return (event) => {
		const _event = "nativeEvent" in event ? event.nativeEvent : event;
		hotkeys.forEach(([hotkey, handler, options = {
			preventDefault: true,
			usePhysicalKeys: false
		}]) => {
			if (getHotkeyMatcher(hotkey, options.usePhysicalKeys)(_event)) {
				if (options.preventDefault) event.preventDefault();
				handler(_event);
			}
		});
	};
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-hotkeys/use-hotkeys.mjs
function shouldFireEvent(event, tagsToIgnore, triggerOnContentEditable = false) {
	if (event.target instanceof HTMLElement) {
		if (triggerOnContentEditable) return !tagsToIgnore.includes(event.target.tagName);
		return !event.target.isContentEditable && !tagsToIgnore.includes(event.target.tagName);
	}
	return true;
}
function useHotkeys(hotkeys, tagsToIgnore = [
	"INPUT",
	"TEXTAREA",
	"SELECT"
], triggerOnContentEditable = false) {
	const handleKeydown = (0, import_react.useEffectEvent)((event) => {
		hotkeys.forEach(([hotkey, handler, options = {
			preventDefault: true,
			usePhysicalKeys: false
		}]) => {
			if (getHotkeyMatcher(hotkey, options.usePhysicalKeys)(event) && shouldFireEvent(event, tagsToIgnore, triggerOnContentEditable)) {
				if (options.preventDefault) event.preventDefault();
				handler(event);
			}
		});
	});
	(0, import_react.useEffect)(() => {
		document.documentElement.addEventListener("keydown", handleKeydown);
		return () => document.documentElement.removeEventListener("keydown", handleKeydown);
	}, []);
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-fullscreen/use-fullscreen.mjs
function getFullscreenElement() {
	const _document = window.document;
	return _document.fullscreenElement || _document.webkitFullscreenElement || _document.mozFullScreenElement || _document.msFullscreenElement;
}
function exitFullscreen() {
	const _document = window.document;
	if (typeof _document.exitFullscreen === "function") return _document.exitFullscreen();
	if (typeof _document.msExitFullscreen === "function") return _document.msExitFullscreen();
	if (typeof _document.webkitExitFullscreen === "function") return _document.webkitExitFullscreen();
	if (typeof _document.mozCancelFullScreen === "function") return _document.mozCancelFullScreen();
	return null;
}
function enterFullScreen(element) {
	const _element = element;
	return _element.requestFullscreen?.() || _element.msRequestFullscreen?.() || _element.webkitEnterFullscreen?.() || _element.webkitRequestFullscreen?.() || _element.mozRequestFullscreen?.();
}
var prefixes = [
	"",
	"webkit",
	"moz",
	"ms"
];
function addEvents(element, events) {
	const { onFullScreen, onError } = events;
	prefixes.forEach((prefix) => {
		element.addEventListener(`${prefix}fullscreenchange`, onFullScreen);
		element.addEventListener(`${prefix}fullscreenerror`, onError);
	});
	return () => removeEvents(element, events);
}
function removeEvents(element, { onFullScreen, onError }) {
	prefixes.forEach((prefix) => {
		element.removeEventListener(`${prefix}fullscreenchange`, onFullScreen);
		element.removeEventListener(`${prefix}fullscreenerror`, onError);
	});
}
function useFullscreenElement() {
	const [fullscreen, setFullscreen] = (0, import_react.useState)(false);
	const refElement = (0, import_react.useRef)(null);
	const prevNodeRef = (0, import_react.useRef)(null);
	const handleFullscreenChange = (0, import_react.useCallback)(() => {
		setFullscreen(refElement.current === getFullscreenElement());
	}, []);
	const handleFullscreenError = (0, import_react.useCallback)(() => {
		setFullscreen(false);
	}, []);
	const toggle = (0, import_react.useCallback)(async () => {
		if (!getFullscreenElement() && refElement.current) await enterFullScreen(refElement.current);
		else await exitFullscreen();
	}, []);
	return {
		ref: (0, import_react.useCallback)((node) => {
			if (prevNodeRef.current && prevNodeRef.current !== node) removeEvents(prevNodeRef.current, {
				onFullScreen: handleFullscreenChange,
				onError: handleFullscreenError
			});
			if (node) addEvents(node, {
				onFullScreen: handleFullscreenChange,
				onError: handleFullscreenError
			});
			refElement.current = node;
			prevNodeRef.current = node;
		}, []),
		toggle,
		fullscreen
	};
}
function useFullscreenDocument() {
	const [fullscreen, setFullscreen] = (0, import_react.useState)(false);
	const handleFullscreenChange = (0, import_react.useCallback)(() => {
		setFullscreen(getFullscreenElement() === window.document.documentElement);
	}, []);
	const handleFullscreenError = (0, import_react.useCallback)(() => {
		setFullscreen(false);
	}, []);
	const toggle = (0, import_react.useCallback)(async () => {
		if (!getFullscreenElement()) await enterFullScreen(window.document.documentElement);
		else await exitFullscreen();
	}, []);
	(0, import_react.useEffect)(() => {
		return addEvents(window.document.documentElement, {
			onFullScreen: handleFullscreenChange,
			onError: handleFullscreenError
		});
	}, []);
	return {
		toggle,
		fullscreen
	};
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-logger/use-logger.mjs
function useLogger(componentName, props) {
	(0, import_react.useEffect)(() => {
		console.log(`${componentName} mounted`, ...props);
		return () => console.log(`${componentName} unmounted`);
	}, []);
	useDidUpdate(() => {
		console.log(`${componentName} updated`, ...props);
	}, props);
	return null;
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-hover/use-hover.mjs
function useHover() {
	const [hovered, setHovered] = (0, import_react.useState)(false);
	const previousNode = (0, import_react.useRef)(null);
	const handleMouseEnter = (0, import_react.useCallback)(() => {
		setHovered(true);
	}, []);
	const handleMouseLeave = (0, import_react.useCallback)(() => {
		setHovered(false);
	}, []);
	return {
		ref: (0, import_react.useCallback)((node) => {
			if (previousNode.current) {
				previousNode.current.removeEventListener("mouseenter", handleMouseEnter);
				previousNode.current.removeEventListener("mouseleave", handleMouseLeave);
			}
			if (node) {
				node.addEventListener("mouseenter", handleMouseEnter);
				node.addEventListener("mouseleave", handleMouseLeave);
			}
			previousNode.current = node;
			return () => {
				previousNode.current = null;
				setHovered(false);
			};
		}, [handleMouseEnter, handleMouseLeave]),
		hovered
	};
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-validated-state/use-validated-state.mjs
function useValidatedState(initialValue, validate, initialValidationState) {
	const [value, setValue] = (0, import_react.useState)(initialValue);
	const [lastValidValue, setLastValidValue] = (0, import_react.useState)(validate(initialValue) ? initialValue : void 0);
	const [valid, setValid] = (0, import_react.useState)(typeof initialValidationState === "boolean" ? initialValidationState : validate(initialValue));
	const onChange = (val) => {
		if (validate(val)) {
			setLastValidValue(val);
			setValid(true);
		} else setValid(false);
		setValue(val);
	};
	return [{
		value,
		lastValidValue,
		valid
	}, onChange];
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-os/use-os.mjs
function isMacOS(userAgent) {
	return /(Macintosh)|(MacIntel)|(MacPPC)|(Mac68K)/i.test(userAgent);
}
function isIOS(userAgent) {
	return /(iPhone)|(iPad)|(iPod)/i.test(userAgent);
}
function isWindows(userAgent) {
	return /(Win32)|(Win64)|(Windows)|(WinCE)/i.test(userAgent);
}
function isAndroid(userAgent) {
	return /Android/i.test(userAgent);
}
function isLinux(userAgent) {
	return /Linux/i.test(userAgent);
}
function isChromeOS(userAgent) {
	return /CrOS/i.test(userAgent);
}
function getOS() {
	if (typeof window === "undefined") return "undetermined";
	const { userAgent } = window.navigator;
	if (isIOS(userAgent) || isMacOS(userAgent) && "ontouchend" in document) return "ios";
	if (isMacOS(userAgent)) return "macos";
	if (isWindows(userAgent)) return "windows";
	if (isAndroid(userAgent)) return "android";
	if (isChromeOS(userAgent)) return "chromeos";
	if (isLinux(userAgent)) return "linux";
	return "undetermined";
}
function useOs(options = { getValueInEffect: true }) {
	const [value, setValue] = (0, import_react.useState)(options.getValueInEffect ? "undetermined" : getOS());
	useIsomorphicEffect(() => {
		if (options.getValueInEffect) setValue(getOS);
	}, []);
	return value;
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-set-state/use-set-state.mjs
function useSetState(initialState) {
	const [state, setState] = (0, import_react.useState)(initialState);
	return [state, (0, import_react.useCallback)((statePartial) => setState((current) => ({
		...current,
		...typeof statePartial === "function" ? statePartial(current) : statePartial
	})), [])];
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-input-state/use-input-state.mjs
function getInputOnChange(setValue) {
	return (val) => {
		if (!val) setValue(val);
		else if (typeof val === "function") setValue(val);
		else if (typeof val === "object" && "nativeEvent" in val) {
			const { currentTarget } = val;
			if (currentTarget.type === "checkbox") setValue(currentTarget.checked);
			else setValue(currentTarget.value);
		} else setValue(val);
	};
}
function useInputState(initialState) {
	const [value, setValue] = (0, import_react.useState)(initialState);
	return [value, getInputOnChange(setValue)];
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-event-listener/use-event-listener.mjs
function useEventListener(type, listener, options) {
	const previousListener = (0, import_react.useRef)(null);
	const previousNode = (0, import_react.useRef)(null);
	const callbackRef = (0, import_react.useCallback)((node) => {
		if (!node) return;
		if (previousNode.current && previousListener.current) previousNode.current.removeEventListener(type, previousListener.current, options);
		node.addEventListener(type, listener, options);
		previousNode.current = node;
		previousListener.current = listener;
	}, [
		type,
		listener,
		options
	]);
	(0, import_react.useEffect)(() => () => {
		if (previousNode.current && previousListener.current) previousNode.current.removeEventListener(type, previousListener.current, options);
	}, [type, options]);
	return callbackRef;
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-disclosure/use-disclosure.mjs
function useDisclosure(initialState = false, options = {}) {
	const [opened, setOpened] = (0, import_react.useState)(initialState);
	const open = (0, import_react.useCallback)(() => {
		setOpened((isOpened) => {
			if (!isOpened) {
				options.onOpen?.();
				return true;
			}
			return isOpened;
		});
	}, [options.onOpen]);
	const close = (0, import_react.useCallback)(() => {
		setOpened((isOpened) => {
			if (isOpened) {
				options.onClose?.();
				return false;
			}
			return isOpened;
		});
	}, [options.onClose]);
	return [opened, {
		open,
		close,
		toggle: (0, import_react.useCallback)(() => {
			opened ? close() : open();
		}, [
			close,
			open,
			opened
		]),
		set: setOpened
	}];
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-focus-within/use-focus-within.mjs
function containsRelatedTarget(event) {
	if (event.currentTarget instanceof HTMLElement && event.relatedTarget instanceof HTMLElement) return event.currentTarget.contains(event.relatedTarget);
	return false;
}
function useFocusWithin({ onBlur, onFocus } = {}) {
	const [focused, setFocused] = (0, import_react.useState)(false);
	const focusedRef = (0, import_react.useRef)(false);
	const previousNode = (0, import_react.useRef)(null);
	const onFocusRef = useCallbackRef(onFocus);
	const onBlurRef = useCallbackRef(onBlur);
	const _setFocused = (0, import_react.useCallback)((value) => {
		setFocused(value);
		focusedRef.current = value;
	}, []);
	const handleFocusIn = (0, import_react.useCallback)((event) => {
		if (!focusedRef.current) {
			_setFocused(true);
			onFocusRef(event);
		}
	}, []);
	const handleFocusOut = (0, import_react.useCallback)((event) => {
		if (focusedRef.current && !containsRelatedTarget(event)) {
			_setFocused(false);
			onBlurRef(event);
		}
	}, []);
	const callbackRef = (0, import_react.useCallback)((node) => {
		if (!node) return;
		if (previousNode.current) {
			previousNode.current.removeEventListener("focusin", handleFocusIn);
			previousNode.current.removeEventListener("focusout", handleFocusOut);
		}
		node.addEventListener("focusin", handleFocusIn);
		node.addEventListener("focusout", handleFocusOut);
		previousNode.current = node;
	}, [handleFocusIn, handleFocusOut]);
	(0, import_react.useEffect)(() => () => {
		if (previousNode.current) {
			previousNode.current.removeEventListener("focusin", handleFocusIn);
			previousNode.current.removeEventListener("focusout", handleFocusOut);
		}
	}, []);
	return {
		ref: callbackRef,
		focused
	};
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-network/use-network.mjs
function getConnection() {
	if (typeof navigator === "undefined") return {};
	const _navigator = navigator;
	const connection = _navigator.connection || _navigator.mozConnection || _navigator.webkitConnection;
	if (!connection) return {};
	return {
		downlink: connection?.downlink,
		downlinkMax: connection?.downlinkMax,
		effectiveType: connection?.effectiveType,
		rtt: connection?.rtt,
		saveData: connection?.saveData,
		type: connection?.type
	};
}
function useNetwork() {
	const [status, setStatus] = (0, import_react.useState)({ online: true });
	const handleConnectionChange = (0, import_react.useCallback)(() => setStatus((current) => ({
		...current,
		...getConnection()
	})), []);
	useWindowEvent("online", () => setStatus({
		online: true,
		...getConnection()
	}));
	useWindowEvent("offline", () => setStatus({
		online: false,
		...getConnection()
	}));
	(0, import_react.useEffect)(() => {
		const _navigator = navigator;
		if (_navigator.connection) {
			setStatus({
				online: _navigator.onLine,
				...getConnection()
			});
			_navigator.connection.addEventListener("change", handleConnectionChange);
			return () => _navigator.connection.removeEventListener("change", handleConnectionChange);
		}
		if (typeof _navigator.onLine === "boolean") setStatus((current) => ({
			...current,
			online: _navigator.onLine
		}));
	}, []);
	return status;
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-timeout/use-timeout.mjs
function useTimeout(callback, delay, options = { autoInvoke: false }) {
	const timeoutRef = (0, import_react.useRef)(null);
	const handleCallback = useCallbackRef(callback);
	const start = (0, import_react.useCallback)((...args) => {
		if (!timeoutRef.current) timeoutRef.current = window.setTimeout(() => {
			handleCallback(...args);
			timeoutRef.current = null;
		}, delay);
	}, [delay]);
	const clear = (0, import_react.useCallback)(() => {
		if (timeoutRef.current) {
			window.clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
	}, []);
	(0, import_react.useEffect)(() => {
		if (options.autoInvoke) start();
		return clear;
	}, [clear, start]);
	return {
		start,
		clear
	};
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-text-selection/use-text-selection.mjs
function useTextSelection() {
	const forceUpdate = useForceUpdate();
	const [selection, setSelection] = (0, import_react.useState)(null);
	const handleSelectionChange = (0, import_react.useEffectEvent)(() => {
		setSelection(document.getSelection());
		forceUpdate();
	});
	(0, import_react.useEffect)(() => {
		setSelection(document.getSelection());
		document.addEventListener("selectionchange", handleSelectionChange);
		return () => document.removeEventListener("selectionchange", handleSelectionChange);
	}, []);
	return selection;
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-previous/use-previous.mjs
function usePrevious(value) {
	const ref = (0, import_react.useRef)(void 0);
	(0, import_react.useEffect)(() => {
		ref.current = value;
	}, [value]);
	return ref.current;
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-favicon/use-favicon.mjs
var MIME_TYPES = {
	ico: "image/x-icon",
	png: "image/png",
	svg: "image/svg+xml",
	gif: "image/gif"
};
function useFavicon(url) {
	const link = (0, import_react.useRef)(null);
	useIsomorphicEffect(() => {
		if (!url) return;
		if (!link.current) {
			document.querySelectorAll("link[rel*=\"icon\"]").forEach((element) => document.head.removeChild(element));
			const element = document.createElement("link");
			element.rel = "shortcut icon";
			link.current = element;
			document.querySelector("head").appendChild(element);
		}
		const splittedUrl = url.split(".");
		const mimeType = MIME_TYPES[splittedUrl[splittedUrl.length - 1].toLowerCase()];
		if (mimeType) link.current.setAttribute("type", mimeType);
		else link.current.removeAttribute("type");
		link.current.setAttribute("href", url);
	}, [url]);
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-scroll-direction/use-scroll-direction.mjs
function useScrollDirection() {
	const lastScrollTopRef = (0, import_react.useRef)(0);
	const [scrollDirection, setScrollDirection] = (0, import_react.useState)("unknown");
	const isResizingRef = (0, import_react.useRef)(false);
	const resizeTimerRef = (0, import_react.useRef)(void 0);
	const handleScroll = (0, import_react.useEffectEvent)(() => {
		if (isResizingRef.current) return;
		const currentScrollTop = window.scrollY || document.documentElement.scrollTop;
		setScrollDirection(currentScrollTop < lastScrollTopRef.current ? "up" : "down");
		lastScrollTopRef.current = currentScrollTop;
	});
	(0, import_react.useEffect)(() => {
		const handleResize = () => {
			isResizingRef.current = true;
			window.clearTimeout(resizeTimerRef.current);
			resizeTimerRef.current = window.setTimeout(() => {
				isResizingRef.current = false;
			}, 300);
		};
		window.addEventListener("scroll", handleScroll);
		window.addEventListener("resize", handleResize);
		return () => {
			window.removeEventListener("scroll", handleScroll);
			window.removeEventListener("resize", handleResize);
			clearTimeout(resizeTimerRef.current);
		};
	}, []);
	return scrollDirection;
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-headroom/use-headroom.mjs
var isFixed = (current, fixedAt) => current <= fixedAt;
var isPinnedOrReleased = (current, fixedAt, isCurrentlyPinnedRef, isScrollingUp, onPin, onRelease) => {
	const isInFixedPosition = isFixed(current, fixedAt);
	if (isInFixedPosition && !isCurrentlyPinnedRef.current) {
		isCurrentlyPinnedRef.current = true;
		onPin?.();
	} else if (!isInFixedPosition && isScrollingUp && !isCurrentlyPinnedRef.current) {
		isCurrentlyPinnedRef.current = true;
		onPin?.();
	} else if (!isInFixedPosition && !isScrollingUp && isCurrentlyPinnedRef.current) {
		isCurrentlyPinnedRef.current = false;
		onRelease?.();
	}
};
function useHeadroom({ fixedAt = 0, scrollDistance = 100, onPin, onFix, onRelease } = {}) {
	const isCurrentlyPinnedRef = (0, import_react.useRef)(false);
	const isScrollingUp = useScrollDirection() === "up";
	const [{ y: scrollPosition }] = useWindowScroll();
	const onPinEvent = (0, import_react.useEffectEvent)(() => onPin?.());
	const onReleaseEvent = (0, import_react.useEffectEvent)(() => onRelease?.());
	const onFixEvent = (0, import_react.useEffectEvent)(() => onFix?.());
	useIsomorphicEffect(() => {
		isPinnedOrReleased(scrollPosition, fixedAt, isCurrentlyPinnedRef, isScrollingUp, onPinEvent, onReleaseEvent);
	}, [
		scrollPosition,
		fixedAt,
		isScrollingUp
	]);
	const wasFixedRef = (0, import_react.useRef)(false);
	useIsomorphicEffect(() => {
		const currentlyInFixedZone = isFixed(scrollPosition, fixedAt);
		if (currentlyInFixedZone && !wasFixedRef.current) onFixEvent();
		wasFixedRef.current = currentlyInFixedZone;
	}, [scrollPosition, fixedAt]);
	const currentlyFixed = isFixed(scrollPosition, fixedAt);
	const prevIsFixedRef = (0, import_react.useRef)(currentlyFixed);
	const directionChangeScrollYRef = (0, import_react.useRef)(scrollPosition);
	const progressAtDirectionChangeRef = (0, import_react.useRef)(currentlyFixed ? 1 : 0);
	const prevIsScrollingUpRef = (0, import_react.useRef)(isScrollingUp);
	if (prevIsFixedRef.current !== currentlyFixed) {
		prevIsFixedRef.current = currentlyFixed;
		if (!currentlyFixed) {
			directionChangeScrollYRef.current = fixedAt;
			progressAtDirectionChangeRef.current = 1;
		} else {
			directionChangeScrollYRef.current = scrollPosition;
			progressAtDirectionChangeRef.current = 1;
		}
		prevIsScrollingUpRef.current = isScrollingUp;
	}
	if (!currentlyFixed && prevIsScrollingUpRef.current !== isScrollingUp) {
		const transitionDelta = Math.abs(scrollPosition - directionChangeScrollYRef.current);
		const transitionProgress = prevIsScrollingUpRef.current ? Math.min(progressAtDirectionChangeRef.current + transitionDelta / scrollDistance, 1) : Math.max(progressAtDirectionChangeRef.current - transitionDelta / scrollDistance, 0);
		prevIsScrollingUpRef.current = isScrollingUp;
		directionChangeScrollYRef.current = scrollPosition;
		progressAtDirectionChangeRef.current = transitionProgress;
	}
	let scrollProgress;
	if (currentlyFixed) scrollProgress = 1;
	else {
		const scrollDelta = Math.abs(scrollPosition - directionChangeScrollYRef.current);
		if (isScrollingUp) scrollProgress = Math.min(progressAtDirectionChangeRef.current + scrollDelta / scrollDistance, 1);
		else scrollProgress = Math.max(progressAtDirectionChangeRef.current - scrollDelta / scrollDistance, 0);
	}
	return {
		pinned: scrollProgress > 0,
		scrollProgress
	};
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-eye-dropper/use-eye-dropper.mjs
function useEyeDropper() {
	const [supported, setSupported] = (0, import_react.useState)(false);
	useIsomorphicEffect(() => {
		setSupported(typeof window !== "undefined" && !isOpera() && "EyeDropper" in window);
	}, []);
	return {
		supported,
		open: (0, import_react.useCallback)((options = {}) => {
			if (supported) return new window.EyeDropper().open(options);
			return Promise.resolve(void 0);
		}, [supported])
	};
}
function isOpera() {
	return navigator.userAgent.includes("OPR");
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-in-viewport/use-in-viewport.mjs
function useInViewport() {
	const observer = (0, import_react.useRef)(null);
	const [inViewport, setInViewport] = (0, import_react.useState)(false);
	return {
		ref: (0, import_react.useCallback)((node) => {
			if (typeof IntersectionObserver !== "undefined") {
				observer.current?.disconnect();
				if (node) {
					observer.current = new IntersectionObserver((entries) => {
						const lastEntry = entries[entries.length - 1];
						setInViewport(lastEntry.isIntersecting);
					});
					observer.current.observe(node);
				} else {
					observer.current = null;
					setInViewport(false);
				}
			}
		}, []),
		inViewport
	};
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-mutation-observer/use-mutation-observer.mjs
function useMutationObserver(callback, options) {
	const observer = (0, import_react.useRef)(null);
	return (0, import_react.useCallback)((node) => {
		if (observer.current) {
			observer.current.disconnect();
			observer.current = null;
		}
		if (node) {
			observer.current = new MutationObserver(callback);
			observer.current.observe(node, options);
		}
		return () => {
			if (observer.current) {
				observer.current.disconnect();
				observer.current = null;
			}
		};
	}, [callback, options]);
}
function useMutationObserverTarget(callback, options, target) {
	const observer = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (observer.current) {
			observer.current.disconnect();
			observer.current = null;
		}
		const targetElement = typeof target === "function" ? target() : target;
		if (targetElement) {
			observer.current = new MutationObserver(callback);
			observer.current.observe(targetElement, options);
		}
		return () => {
			if (observer.current) {
				observer.current.disconnect();
				observer.current = null;
			}
		};
	}, [
		callback,
		options,
		target
	]);
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-mounted/use-mounted.mjs
function useMounted() {
	const [mounted, setMounted] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => setMounted(true), []);
	return mounted;
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-state-history/use-state-history.mjs
function useStateHistory(initialValue) {
	const [state, setState] = (0, import_react.useState)({
		history: [initialValue],
		current: 0
	});
	const set = (0, import_react.useCallback)((val) => setState((currentState) => {
		const nextState = [...currentState.history.slice(0, currentState.current + 1), val];
		return {
			history: nextState,
			current: nextState.length - 1
		};
	}), []);
	const back = (0, import_react.useCallback)((steps = 1) => setState((currentState) => ({
		history: currentState.history,
		current: Math.max(0, currentState.current - steps)
	})), []);
	const forward = (0, import_react.useCallback)((steps = 1) => setState((currentState) => ({
		history: currentState.history,
		current: Math.min(currentState.history.length - 1, currentState.current + steps)
	})), []);
	const reset = (0, import_react.useCallback)(() => {
		setState({
			history: [initialValue],
			current: 0
		});
	}, [initialValue]);
	const handlers = (0, import_react.useMemo)(() => ({
		back,
		forward,
		reset,
		set
	}), [
		back,
		forward,
		reset,
		set
	]);
	return [
		state.history[state.current],
		handlers,
		state
	];
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-map/use-map.mjs
function useMap(initialState) {
	const mapRef = (0, import_react.useRef)(new Map(initialState));
	const forceUpdate = useForceUpdate();
	mapRef.current.set = (...args) => {
		Map.prototype.set.apply(mapRef.current, args);
		forceUpdate();
		return mapRef.current;
	};
	mapRef.current.clear = (...args) => {
		Map.prototype.clear.apply(mapRef.current, args);
		forceUpdate();
	};
	mapRef.current.delete = (...args) => {
		const res = Map.prototype.delete.apply(mapRef.current, args);
		forceUpdate();
		return res;
	};
	return mapRef.current;
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-set/use-set.mjs
function readonlySetLikeToSet(input) {
	if (input instanceof Set) return input;
	const result = /* @__PURE__ */ new Set();
	const iterator = input.keys();
	let next = iterator.next();
	while (!next.done) {
		result.add(next.value);
		next = iterator.next();
	}
	return result;
}
function useSet(values) {
	const setRef = (0, import_react.useRef)(new Set(values));
	const forceUpdate = useForceUpdate();
	setRef.current.add = (...args) => {
		const res = Set.prototype.add.apply(setRef.current, args);
		forceUpdate();
		return res;
	};
	setRef.current.clear = (...args) => {
		Set.prototype.clear.apply(setRef.current, args);
		forceUpdate();
	};
	setRef.current.delete = (...args) => {
		const res = Set.prototype.delete.apply(setRef.current, args);
		forceUpdate();
		return res;
	};
	setRef.current.union = (other) => {
		const result = new Set(setRef.current);
		readonlySetLikeToSet(other).forEach((item) => result.add(item));
		return result;
	};
	setRef.current.intersection = (other) => {
		const result = /* @__PURE__ */ new Set();
		const otherSet = readonlySetLikeToSet(other);
		setRef.current.forEach((item) => {
			if (otherSet.has(item)) result.add(item);
		});
		return result;
	};
	setRef.current.difference = (other) => {
		const result = /* @__PURE__ */ new Set();
		const otherSet = readonlySetLikeToSet(other);
		setRef.current.forEach((item) => {
			if (!otherSet.has(item)) result.add(item);
		});
		return result;
	};
	setRef.current.symmetricDifference = (other) => {
		const result = /* @__PURE__ */ new Set();
		const otherSet = readonlySetLikeToSet(other);
		setRef.current.forEach((item) => {
			if (!otherSet.has(item)) result.add(item);
		});
		otherSet.forEach((item) => {
			if (!setRef.current.has(item)) result.add(item);
		});
		return result;
	};
	return setRef.current;
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-throttled-callback/use-throttled-callback.mjs
function useThrottledCallbackWithClearTimeout(callback, wait) {
	const handleCallback = useCallbackRef(callback);
	const latestInArgsRef = (0, import_react.useRef)(null);
	const latestOutArgsRef = (0, import_react.useRef)(null);
	const active = (0, import_react.useRef)(true);
	const waitRef = (0, import_react.useRef)(wait);
	const timeoutRef = (0, import_react.useRef)(-1);
	const clearTimeout = () => window.clearTimeout(timeoutRef.current);
	const callThrottledCallback = (0, import_react.useCallback)((...args) => {
		handleCallback(...args);
		latestInArgsRef.current = args;
		latestOutArgsRef.current = args;
		active.current = false;
	}, [handleCallback]);
	const timerCallback = (0, import_react.useCallback)(() => {
		if (latestInArgsRef.current && latestInArgsRef.current !== latestOutArgsRef.current) {
			callThrottledCallback(...latestInArgsRef.current);
			timeoutRef.current = window.setTimeout(timerCallback, waitRef.current);
		} else active.current = true;
	}, [callThrottledCallback]);
	const throttled = (0, import_react.useCallback)((...args) => {
		if (active.current) {
			callThrottledCallback(...args);
			timeoutRef.current = window.setTimeout(timerCallback, waitRef.current);
		} else latestInArgsRef.current = args;
	}, [callThrottledCallback, timerCallback]);
	(0, import_react.useEffect)(() => {
		waitRef.current = wait;
	}, [wait]);
	return [throttled, clearTimeout];
}
function useThrottledCallback(callback, wait) {
	const [throttled, clearTimeout] = useThrottledCallbackWithClearTimeout(callback, wait);
	(0, import_react.useEffect)(() => clearTimeout, []);
	return throttled;
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-throttled-state/use-throttled-state.mjs
function useThrottledState(defaultValue, wait) {
	const [value, setValue] = (0, import_react.useState)(defaultValue);
	const [setThrottledValue, clearTimeout] = useThrottledCallbackWithClearTimeout(setValue, wait);
	(0, import_react.useEffect)(() => clearTimeout, []);
	return [value, setThrottledValue];
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-throttled-value/use-throttled-value.mjs
function useThrottledValue(value, wait) {
	const [throttledValue, setThrottledValue] = (0, import_react.useState)(value);
	const valueRef = (0, import_react.useRef)(value);
	const [throttledSetValue, clearTimeout] = useThrottledCallbackWithClearTimeout(setThrottledValue, wait);
	(0, import_react.useEffect)(() => {
		if (value !== valueRef.current) {
			valueRef.current = value;
			throttledSetValue(value);
		}
	}, [throttledSetValue, value]);
	(0, import_react.useEffect)(() => clearTimeout, []);
	return throttledValue;
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-is-first-render/use-is-first-render.mjs
function useIsFirstRender() {
	const renderRef = (0, import_react.useRef)(true);
	if (renderRef.current === true) {
		renderRef.current = false;
		return true;
	}
	return renderRef.current;
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-orientation/use-orientation.mjs
function getInitialValue(initialValue, getInitialValueInEffect) {
	if (getInitialValueInEffect) return initialValue;
	if (typeof window !== "undefined" && "screen" in window) return {
		angle: window.screen.orientation?.angle ?? initialValue.angle,
		type: window.screen.orientation?.type ?? initialValue.type
	};
	return initialValue;
}
function useOrientation({ defaultAngle = 0, defaultType = "landscape-primary", getInitialValueInEffect = true } = {}) {
	const [orientation, setOrientation] = (0, import_react.useState)(getInitialValue({
		angle: defaultAngle,
		type: defaultType
	}, getInitialValueInEffect));
	const handleOrientationChange = (event) => {
		const target = event.currentTarget;
		setOrientation({
			angle: target?.angle || 0,
			type: target?.type || "landscape-primary"
		});
	};
	useIsomorphicEffect(() => {
		if (window.screen.orientation) {
			setOrientation({
				angle: window.screen.orientation.angle,
				type: window.screen.orientation.type
			});
			window.screen.orientation.addEventListener("change", handleOrientationChange);
			return () => window.screen.orientation?.removeEventListener("change", handleOrientationChange);
		}
	}, []);
	return orientation;
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-fetch/use-fetch.mjs
function useFetch(url, { autoInvoke = true, ...options } = {}) {
	const [data, setData] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const controller = (0, import_react.useRef)(null);
	const refetch = (0, import_react.useCallback)(() => {
		if (controller.current) controller.current.abort();
		controller.current = new AbortController();
		setLoading(true);
		return fetch(url, {
			...options,
			signal: controller.current.signal
		}).then((res) => {
			if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
			return res.json();
		}).then((res) => {
			setData(res);
			setLoading(false);
			return res;
		}).catch((err) => {
			setLoading(false);
			if (err.name !== "AbortError") setError(err);
			return err;
		});
	}, [url, JSON.stringify(options)]);
	const abort = (0, import_react.useCallback)(() => {
		if (controller.current) controller.current?.abort("");
	}, []);
	(0, import_react.useEffect)(() => {
		if (autoInvoke) refetch();
		return () => {
			if (controller.current) controller.current.abort("");
		};
	}, [refetch, autoInvoke]);
	return {
		data,
		loading,
		error,
		refetch,
		abort
	};
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-radial-move/use-radial-move.mjs
function radiansToDegrees(radians) {
	return radians * (180 / Math.PI);
}
function getElementCenter(element) {
	const rect = element.getBoundingClientRect();
	return [rect.left + rect.width / 2, rect.top + rect.height / 2];
}
function getAngle(coordinates, element) {
	const center = getElementCenter(element);
	const x = coordinates[0] - center[0];
	const y = coordinates[1] - center[1];
	return 360 - (radiansToDegrees(Math.atan2(x, y)) + 180);
}
function toFixed(value, digits) {
	return parseFloat(value.toFixed(digits));
}
function getDigitsAfterDot(value) {
	return value.toString().split(".")[1]?.length || 0;
}
function normalizeRadialValue(degree, step) {
	const clamped = clamp(degree, 0, 360);
	const high = Math.ceil(clamped / step);
	const low = Math.round(clamped / step);
	return toFixed(high >= clamped / step ? high * step === 360 ? 0 : high * step : low * step, getDigitsAfterDot(step));
}
function useRadialMove(onChange, { step = .01, onChangeEnd, onScrubStart, onScrubEnd } = {}) {
	const [active, setActive] = (0, import_react.useState)(false);
	const cleanupRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		return () => {
			cleanupRef.current?.();
		};
	}, []);
	return {
		ref: (0, import_react.useCallback)((node) => {
			const update = (event, done = false) => {
				if (node) {
					node.style.userSelect = "none";
					const newValue = normalizeRadialValue(getAngle([event.clientX, event.clientY], node), step || 1);
					onChange(newValue);
					done && onChangeEnd?.(newValue);
				}
			};
			const beginTracking = () => {
				onScrubStart?.();
				setActive(true);
				document.addEventListener("mousemove", handleMouseMove, false);
				document.addEventListener("mouseup", handleMouseUp, false);
				document.addEventListener("touchmove", handleTouchMove, { passive: false });
				document.addEventListener("touchend", handleTouchEnd, false);
			};
			const endTracking = () => {
				onScrubEnd?.();
				setActive(false);
				document.removeEventListener("mousemove", handleMouseMove, false);
				document.removeEventListener("mouseup", handleMouseUp, false);
				document.removeEventListener("touchmove", handleTouchMove, false);
				document.removeEventListener("touchend", handleTouchEnd, false);
			};
			const onMouseDown = (event) => {
				beginTracking();
				update(event);
			};
			const handleMouseMove = (event) => {
				update(event);
			};
			const handleMouseUp = (event) => {
				update(event, true);
				endTracking();
			};
			const handleTouchMove = (event) => {
				event.preventDefault();
				update(event.touches[0]);
			};
			const handleTouchEnd = (event) => {
				update(event.changedTouches[0], true);
				endTracking();
			};
			const handleTouchStart = (event) => {
				event.preventDefault();
				beginTracking();
				update(event.touches[0]);
			};
			node?.addEventListener("mousedown", onMouseDown);
			node?.addEventListener("touchstart", handleTouchStart, { passive: false });
			cleanupRef.current = () => {
				document.removeEventListener("mousemove", handleMouseMove, false);
				document.removeEventListener("mouseup", handleMouseUp, false);
				document.removeEventListener("touchmove", handleTouchMove, false);
				document.removeEventListener("touchend", handleTouchEnd, false);
			};
			return () => {
				if (node) {
					node.removeEventListener("mousedown", onMouseDown);
					node.removeEventListener("touchstart", handleTouchStart);
				}
			};
		}, [onChange]),
		active
	};
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-scroll-spy/use-scroll-spy.mjs
function getHeadingsData(headings, getDepth, getValue) {
	const result = [];
	for (let i = 0; i < headings.length; i += 1) {
		const heading = headings[i];
		result.push({
			depth: getDepth(heading),
			value: getValue(heading),
			id: heading.id || randomId(),
			getNode: () => heading.id ? document.getElementById(heading.id) : heading
		});
	}
	return result;
}
function getActiveElement(rects, offset = 0) {
	if (rects.length === 0) return -1;
	return rects.reduce((acc, item, index) => {
		if (Math.abs(acc.position - offset) < Math.abs(item.y - offset)) return acc;
		return {
			index,
			position: item.y
		};
	}, {
		index: 0,
		position: rects[0].y
	}).index;
}
function getDefaultDepth(element) {
	return Number(element.tagName[1]);
}
function getDefaultValue(element) {
	return element.textContent || "";
}
function useScrollSpy({ selector = "h1, h2, h3, h4, h5, h6", getDepth = getDefaultDepth, getValue = getDefaultValue, offset = 0, scrollHost } = {}) {
	const [active, setActive] = (0, import_react.useState)(-1);
	const [initialized, setInitialized] = (0, import_react.useState)(false);
	const [data, setData] = (0, import_react.useState)([]);
	const headingsRef = (0, import_react.useRef)([]);
	const handleScroll = (0, import_react.useEffectEvent)(() => {
		setActive(getActiveElement(headingsRef.current.map((d) => d.getNode().getBoundingClientRect()), offset));
	});
	const initialize = () => {
		const headings = getHeadingsData(Array.from(document.querySelectorAll(selector)), getDepth, getValue);
		headingsRef.current = headings;
		setInitialized(true);
		setData(headings);
		setActive(getActiveElement(headings.map((d) => d.getNode().getBoundingClientRect()), offset));
	};
	(0, import_react.useEffect)(() => {
		initialize();
		const _scrollHost = scrollHost || window;
		_scrollHost.addEventListener("scroll", handleScroll);
		return () => _scrollHost.removeEventListener("scroll", handleScroll);
	}, [
		scrollHost,
		selector,
		offset
	]);
	return {
		reinitialize: initialize,
		active,
		initialized,
		data
	};
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-scroller/use-scroller.mjs
function useScroller(options = {}) {
	const { scrollAmount = 200, draggable = true, onScrollStateChange } = options;
	const containerRef = (0, import_react.useRef)(null);
	const [canScrollStart, setCanScrollStart] = (0, import_react.useState)(false);
	const [canScrollEnd, setCanScrollEnd] = (0, import_react.useState)(false);
	const [isDragging, setIsDragging] = (0, import_react.useState)(false);
	const isDraggingRef = (0, import_react.useRef)(false);
	const hasDraggedRef = (0, import_react.useRef)(false);
	const startX = (0, import_react.useRef)(0);
	const scrollLeftStart = (0, import_react.useRef)(0);
	const onScrollStateChangeRef = (0, import_react.useRef)(onScrollStateChange);
	onScrollStateChangeRef.current = onScrollStateChange;
	const updateScrollState = (0, import_react.useCallback)(() => {
		const container = containerRef.current;
		if (container) {
			const { scrollLeft, scrollWidth, clientWidth } = container;
			const isRtl = getComputedStyle(container).direction === "rtl";
			let newCanScrollStart;
			let newCanScrollEnd;
			if (isRtl) {
				newCanScrollStart = scrollLeft < -1;
				newCanScrollEnd = scrollLeft > -(scrollWidth - clientWidth) + 1;
			} else {
				newCanScrollStart = scrollLeft > 1;
				newCanScrollEnd = scrollLeft < scrollWidth - clientWidth - 1;
			}
			setCanScrollStart(newCanScrollStart);
			setCanScrollEnd(newCanScrollEnd);
			onScrollStateChangeRef.current?.({
				canScrollStart: newCanScrollStart,
				canScrollEnd: newCanScrollEnd
			});
		}
	}, []);
	(0, import_react.useEffect)(() => {
		updateScrollState();
		const container = containerRef.current;
		if (container) {
			container.addEventListener("scroll", updateScrollState);
			const resizeObserver = new ResizeObserver(updateScrollState);
			resizeObserver.observe(container);
			return () => {
				container.removeEventListener("scroll", updateScrollState);
				resizeObserver.disconnect();
			};
		}
	}, [updateScrollState]);
	const scroll = (0, import_react.useCallback)((direction) => {
		const container = containerRef.current;
		if (container) {
			const isRtl = getComputedStyle(container).direction === "rtl";
			const amount = scrollAmount;
			const scrollBy = direction === "end" ? amount : -amount;
			const adjustedScrollBy = isRtl ? -scrollBy : scrollBy;
			container.scrollBy({
				left: adjustedScrollBy,
				behavior: "smooth"
			});
		}
	}, [scrollAmount]);
	const scrollStart = (0, import_react.useCallback)(() => scroll("start"), [scroll]);
	const scrollEnd = (0, import_react.useCallback)(() => scroll("end"), [scroll]);
	const handleMouseDown = (0, import_react.useCallback)((event) => {
		if (!draggable) return;
		const container = containerRef.current;
		if (container) {
			isDraggingRef.current = true;
			hasDraggedRef.current = false;
			setIsDragging(true);
			startX.current = event.pageX - container.offsetLeft;
			scrollLeftStart.current = container.scrollLeft;
			container.style.cursor = "grabbing";
			container.style.userSelect = "none";
		}
	}, [draggable]);
	const handleMouseMove = (0, import_react.useCallback)((event) => {
		if (!isDraggingRef.current) return;
		event.preventDefault();
		const container = containerRef.current;
		if (container) {
			const walk = event.pageX - container.offsetLeft - startX.current;
			if (Math.abs(walk) > 5) hasDraggedRef.current = true;
			container.scrollLeft = scrollLeftStart.current - walk;
		}
	}, []);
	const handleMouseUp = (0, import_react.useCallback)(() => {
		const wasDragged = hasDraggedRef.current;
		isDraggingRef.current = false;
		hasDraggedRef.current = false;
		setIsDragging(false);
		const container = containerRef.current;
		if (container) {
			container.style.cursor = "";
			container.style.userSelect = "";
			if (wasDragged) {
				const suppressClick = (event) => {
					event.stopPropagation();
					event.preventDefault();
					container.removeEventListener("click", suppressClick, true);
				};
				container.addEventListener("click", suppressClick, true);
			}
		}
	}, []);
	const handleMouseLeave = (0, import_react.useCallback)(() => {
		if (isDraggingRef.current) handleMouseUp();
	}, [handleMouseUp]);
	return {
		ref: (0, import_react.useCallback)((node) => {
			containerRef.current = node;
			if (node) updateScrollState();
		}, [updateScrollState]),
		canScrollStart,
		canScrollEnd,
		scrollStart,
		scrollEnd,
		isDragging,
		dragHandlers: {
			onMouseDown: handleMouseDown,
			onMouseMove: handleMouseMove,
			onMouseUp: handleMouseUp,
			onMouseLeave: handleMouseLeave
		}
	};
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-file-dialog/use-file-dialog.mjs
var defaultOptions = {
	multiple: true,
	accept: "*"
};
function getInitialFilesList(files) {
	if (!files) return null;
	if (files instanceof FileList) return files;
	const result = new DataTransfer();
	for (const file of files) result.items.add(file);
	return result.files;
}
function createInput(options) {
	if (typeof document === "undefined") return null;
	const input = document.createElement("input");
	input.type = "file";
	if (options.accept) input.accept = options.accept;
	if (options.multiple) input.multiple = options.multiple;
	if (options.capture) input.capture = options.capture;
	if (options.directory) input.webkitdirectory = options.directory;
	input.style.display = "none";
	return input;
}
function useFileDialog(input = {}) {
	const options = {
		...defaultOptions,
		...input
	};
	const [files, setFiles] = (0, import_react.useState)(getInitialFilesList(options.initialFiles));
	const inputRef = (0, import_react.useRef)(null);
	const handleChange = (0, import_react.useCallback)((event) => {
		const target = event.target;
		if (target?.files) {
			setFiles(target.files);
			options.onChange?.(target.files);
		}
	}, [options.onChange]);
	const createAndSetupInput = (0, import_react.useCallback)(() => {
		inputRef.current?.remove();
		inputRef.current = createInput(options);
		if (inputRef.current) {
			inputRef.current.addEventListener("change", handleChange, { once: true });
			if (options.onCancel) inputRef.current.addEventListener("cancel", options.onCancel, { once: true });
			document.body.appendChild(inputRef.current);
		}
	}, [options, handleChange]);
	useIsomorphicEffect(() => {
		createAndSetupInput();
		return () => inputRef.current?.remove();
	}, []);
	const reset = (0, import_react.useCallback)(() => {
		setFiles(null);
		options.onChange?.(null);
	}, [options.onChange]);
	return {
		files,
		open: (0, import_react.useCallback)(() => {
			if (options.resetOnOpen) reset();
			createAndSetupInput();
			inputRef.current?.click();
		}, [
			options.resetOnOpen,
			reset,
			createAndSetupInput
		]),
		reset
	};
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-long-press/use-long-press.mjs
function useLongPress(onLongPress, options = {}) {
	const { threshold = 400, onStart, onFinish, onCancel } = options;
	const isLongPressActive = (0, import_react.useRef)(false);
	const isPressed = (0, import_react.useRef)(false);
	const timeout = (0, import_react.useRef)(-1);
	(0, import_react.useEffect)(() => () => window.clearTimeout(timeout.current), []);
	return (0, import_react.useMemo)(() => {
		if (typeof onLongPress !== "function") return {};
		const start = (event) => {
			if (!isMouseEvent(event) && !isTouchEvent(event)) return;
			if (onStart) onStart(event);
			isPressed.current = true;
			timeout.current = window.setTimeout(() => {
				onLongPress(event);
				isLongPressActive.current = true;
			}, threshold);
		};
		const cancel = (event) => {
			if (!isMouseEvent(event) && !isTouchEvent(event)) return;
			if (isLongPressActive.current) {
				if (onFinish) onFinish(event);
			} else if (isPressed.current) {
				if (onCancel) onCancel(event);
			}
			isLongPressActive.current = false;
			isPressed.current = false;
			if (timeout.current !== -1) {
				window.clearTimeout(timeout.current);
				timeout.current = -1;
			}
		};
		return {
			onMouseDown: start,
			onMouseUp: cancel,
			onMouseLeave: cancel,
			onTouchStart: start,
			onTouchEnd: cancel,
			onTouchCancel: cancel
		};
	}, [
		onLongPress,
		threshold,
		onCancel,
		onFinish,
		onStart
	]);
}
function isTouchEvent(event) {
	return window.TouchEvent ? event.nativeEvent instanceof TouchEvent : "touches" in event.nativeEvent;
}
function isMouseEvent(event) {
	return event.nativeEvent instanceof MouseEvent;
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-selection/use-selection.mjs
function useSelection(input) {
	const [selectionSet, setSelectionSet] = (0, import_react.useState)(new Set(input.defaultSelection || []));
	useDidUpdate(() => {
		if (input.resetSelectionOnDataChange) setSelectionSet(/* @__PURE__ */ new Set());
	}, [input.data, input.resetSelectionOnDataChange]);
	const select = (0, import_react.useCallback)((selected) => {
		setSelectionSet((state) => {
			if (!state.has(selected)) {
				const newSet = new Set(state);
				newSet.add(selected);
				return newSet;
			}
			return state;
		});
	}, []);
	const deselect = (0, import_react.useCallback)((deselected) => {
		setSelectionSet((state) => {
			if (state.has(deselected)) {
				const newSet = new Set(state);
				newSet.delete(deselected);
				return newSet;
			}
			return state;
		});
	}, []);
	const toggle = (0, import_react.useCallback)((toggled) => {
		setSelectionSet((state) => {
			const newSet = new Set(state);
			if (state.has(toggled)) newSet.delete(toggled);
			else newSet.add(toggled);
			return newSet;
		});
	}, []);
	const resetSelection = (0, import_react.useCallback)(() => {
		setSelectionSet(/* @__PURE__ */ new Set());
	}, []);
	const setSelection = (0, import_react.useCallback)((selection) => {
		setSelectionSet(new Set(selection));
	}, []);
	const isAllSelected = (0, import_react.useCallback)(() => {
		if (input.data.length === 0) return false;
		return input.data.every((item) => selectionSet.has(item));
	}, [selectionSet, input.data]);
	const isSomeSelected = (0, import_react.useCallback)(() => {
		return input.data.some((item) => selectionSet.has(item));
	}, [selectionSet, input.data]);
	return [Array.from(selectionSet), {
		select,
		deselect,
		toggle,
		isAllSelected,
		isSomeSelected,
		setSelection,
		resetSelection
	}];
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-floating-window/use-floating-window.mjs
function useRefValue(value) {
	const ref = (0, import_react.useRef)(value);
	ref.current = value;
	return ref;
}
function useFloatingWindow(options = {}) {
	const [element, setElement] = (0, import_react.useState)(null);
	const ref = (0, import_react.useRef)(null);
	const pos = (0, import_react.useRef)({
		x: 0,
		y: 0
	});
	const offset = (0, import_react.useRef)({
		x: 0,
		y: 0
	});
	const [isDragging, setIsDragging] = (0, import_react.useState)(false);
	const isDraggingRef = (0, import_react.useRef)(false);
	const initialized = (0, import_react.useRef)(false);
	const enabledRef = useRefValue(options.enabled);
	const setDragging = (0, import_react.useCallback)((value) => {
		setIsDragging(value);
		isDraggingRef.current = value;
	}, []);
	const assignRef = (0, import_react.useCallback)((node) => {
		if (node) {
			ref.current = node;
			setElement(node);
		} else {
			ref.current = null;
			setElement(null);
		}
	}, []);
	(0, import_react.useEffect)(() => {
		const el = ref.current;
		if (!initialized.current && el) {
			initialized.current = true;
			pos.current = calculateInitialPosition(el, options);
			el.style.left = `${pos.current.x}px`;
			el.style.top = `${pos.current.y}px`;
			el.style.right = "unset";
			el.style.bottom = "unset";
		}
		return () => {
			initialized.current = false;
		};
	}, [
		element,
		options.constrainOffset,
		options.initialPosition?.top,
		options.initialPosition?.left,
		options.initialPosition?.right,
		options.initialPosition?.bottom,
		options.constrainToViewport
	]);
	(0, import_react.useEffect)(() => {
		const el = ref.current;
		if (!el) return;
		const controller = new AbortController();
		const signal = controller.signal;
		const onStart = (e) => {
			if (enabledRef.current === false) return;
			const point = "touches" in e ? e.touches[0] : e;
			if ("button" in e && e.button !== 0) return;
			if (!getHandle(el, e.target, options)) return;
			setDragging(true);
			document.body.style.userSelect = "none";
			document.body.style.webkitUserSelect = "none";
			const rect = el.getBoundingClientRect();
			offset.current = {
				x: point.clientX - rect.left,
				y: point.clientY - rect.top
			};
			options.onDragStart?.();
			document.addEventListener("mousemove", onMove, { signal });
			document.addEventListener("mouseup", onEnd, { signal });
			document.addEventListener("touchmove", onMove, {
				signal,
				passive: false
			});
			document.addEventListener("touchend", onEnd, { signal });
		};
		const onMove = (e) => {
			if (!isDraggingRef.current) return;
			const point = "touches" in e ? e.touches[0] : e;
			e.preventDefault();
			let x = point.clientX - offset.current.x;
			let y = point.clientY - offset.current.y;
			const constrained = getConstrainedPosition(el, {
				x,
				y
			}, options);
			if (options.axis === "x") {
				x = constrained.x;
				y = pos.current.y;
			} else if (options.axis === "y") {
				x = pos.current.x;
				y = constrained.y;
			} else {
				x = constrained.x;
				y = constrained.y;
			}
			pos.current = {
				x,
				y
			};
			if (ref.current) {
				ref.current.style.left = `${x}px`;
				ref.current.style.top = `${y}px`;
			}
			options.onPositionChange?.({
				x,
				y
			});
		};
		const onEnd = () => {
			if (isDraggingRef.current) {
				setDragging(false);
				document.body.style.userSelect = "";
				document.body.style.webkitUserSelect = "";
				options.onDragEnd?.();
			}
		};
		el.addEventListener("mousedown", onStart, { signal });
		el.addEventListener("touchstart", onStart, {
			signal,
			passive: false
		});
		return () => {
			controller.abort();
		};
	}, [
		options.constrainToViewport,
		options.constrainOffset,
		options.dragHandleSelector,
		options.axis,
		options.onPositionChange,
		options.onDragStart,
		options.onDragEnd,
		options.initialPosition?.top,
		options.initialPosition?.left,
		options.initialPosition?.right,
		options.initialPosition?.bottom,
		element
	]);
	(0, import_react.useEffect)(() => {
		const el = ref.current;
		if (!el) return;
		const observer = new ResizeObserver(() => {
			const constrained = getConstrainedPosition(el, pos.current, options);
			pos.current = constrained;
			el.style.left = `${constrained.x}px`;
			el.style.top = `${constrained.y}px`;
		});
		observer.observe(el);
		return () => {
			observer.disconnect();
		};
	}, [options.constrainToViewport, options.constrainOffset]);
	return {
		ref: assignRef,
		setPosition: (0, import_react.useCallback)((position) => {
			const el = ref.current;
			if (!el) return;
			const offset = options.constrainOffset ?? 0;
			const rect = el.getBoundingClientRect();
			let x;
			let y;
			if (position.left != null) x = position.left;
			else if (position.right != null) x = window.innerWidth - rect.width - position.right;
			if (position.top != null) y = position.top;
			else if (position.bottom != null) y = window.innerHeight - rect.height - position.bottom;
			x = x ?? pos.current.x;
			y = y ?? pos.current.y;
			if (options.constrainToViewport) {
				const clamped = clampToViewport(x, y, el, offset);
				x = clamped.x;
				y = clamped.y;
			}
			pos.current = {
				x,
				y
			};
			el.style.left = `${x}px`;
			el.style.top = `${y}px`;
			options.onPositionChange?.({
				x,
				y
			});
		}, [
			options.constrainToViewport,
			options.constrainOffset,
			options.onPositionChange
		]),
		isDragging
	};
}
function px(v) {
	return v.endsWith("px") ? parseFloat(v) : 0;
}
function calculateInitialPosition(el, options) {
	const rect = el.getBoundingClientRect();
	const offset = options.constrainOffset ?? 0;
	const winW = window.innerWidth;
	const winH = window.innerHeight;
	const style = window.getComputedStyle(el);
	const top = options.initialPosition?.top;
	const left = options.initialPosition?.left;
	const right = options.initialPosition?.right;
	const bottom = options.initialPosition?.bottom;
	let x = offset;
	let y = offset;
	if (left != null) x = left;
	else if (right != null) x = winW - rect.width - right;
	else x = px(style.left) || winW - rect.width - px(style.right) || offset;
	if (top != null) y = top;
	else if (bottom != null) y = winH - rect.height - bottom;
	else y = px(style.top) || winH - rect.height - px(style.bottom) || offset;
	return options.constrainToViewport ? clampToViewport(x, y, el, options.constrainOffset) : {
		x,
		y
	};
}
function getConstrainedPosition(el, pos, options) {
	if (!options.constrainToViewport || !el) return pos;
	const rect = el.getBoundingClientRect();
	const offset = options.constrainOffset ?? 0;
	const maxX = window.innerWidth - rect.width - offset;
	const maxY = window.innerHeight - rect.height - offset;
	return {
		x: Math.min(Math.max(offset, pos.x), maxX),
		y: Math.min(Math.max(offset, pos.y), maxY)
	};
}
function matchesExcludeSelector(target, excludeSelector) {
	if (!excludeSelector) return false;
	if (!(target instanceof Element)) return false;
	return Boolean(target.closest(excludeSelector));
}
function getHandle(el, target, options) {
	if (!(target instanceof Node)) return false;
	if (!options.dragHandleSelector) return !matchesExcludeSelector(target, options.excludeDragHandleSelector);
	return Array.from(el.querySelectorAll(options.dragHandleSelector)).some((handle) => handle.contains(target) && !matchesExcludeSelector(target, options.excludeDragHandleSelector));
}
function clampToViewport(x, y, el, offset = 0) {
	const rect = el.getBoundingClientRect();
	const maxX = window.innerWidth - rect.width - offset;
	const maxY = window.innerHeight - rect.height - offset;
	return {
		x: Math.min(Math.max(offset, x), maxX),
		y: Math.min(Math.max(offset, y), maxY)
	};
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-collapse/use-collapse.mjs
var import_react_dom = /* @__PURE__ */ __toESM(require_react_dom(), 1);
function getAutoHeightDuration(height) {
	if (!height || typeof height === "string") return 0;
	const constant = height / 36;
	return Math.round((4 + 15 * constant ** .25 + constant / 5) * 10);
}
function getElementHeight(elementRef) {
	return elementRef.current ? elementRef.current.scrollHeight : "auto";
}
function useCollapse({ transitionDuration, transitionTimingFunction = "ease", onTransitionEnd, onTransitionStart, expanded, keepMounted }) {
	const collapsedStyles = {
		height: 0,
		overflow: "hidden",
		...keepMounted ? {} : { display: "none" }
	};
	const onTransitionStartEvent = (0, import_react.useEffectEvent)(() => onTransitionStart?.());
	const elementRef = (0, import_react.useRef)(null);
	const [styles, setStylesRaw] = (0, import_react.useState)(expanded ? {} : collapsedStyles);
	const [state, setState] = (0, import_react.useState)(expanded ? "entered" : "exited");
	const setStyles = (newStyles) => {
		(0, import_react_dom.flushSync)(() => setStylesRaw(newStyles));
	};
	const mergeStyles = (newStyles) => {
		setStyles((oldStyles) => ({
			...oldStyles,
			...newStyles
		}));
	};
	const getTransitionStyles = (height) => {
		const duration = transitionDuration ?? getAutoHeightDuration(height);
		return { transition: `height ${duration}ms ${transitionTimingFunction}, opacity ${duration}ms ${transitionTimingFunction}` };
	};
	useDidUpdate(() => {
		if (transitionDuration !== 0) onTransitionStartEvent();
		if (expanded) window.requestAnimationFrame(() => {
			(0, import_react_dom.flushSync)(() => setState("entering"));
			mergeStyles({
				willChange: "height",
				display: "block",
				overflow: "hidden"
			});
			window.requestAnimationFrame(() => {
				const height = getElementHeight(elementRef);
				mergeStyles({
					...getTransitionStyles(height),
					height
				});
			});
		});
		else window.requestAnimationFrame(() => {
			(0, import_react_dom.flushSync)(() => setState("exiting"));
			const height = getElementHeight(elementRef);
			mergeStyles({
				...getTransitionStyles(height),
				willChange: "height",
				height
			});
			window.requestAnimationFrame(() => mergeStyles({
				height: 0,
				overflow: "hidden"
			}));
		});
	}, [expanded]);
	const handleTransitionEnd = (event) => {
		if (event.target !== elementRef.current || event.propertyName !== "height") return;
		if (expanded) {
			const height = getElementHeight(elementRef);
			if (height === styles.height) setStyles({});
			else mergeStyles({ height });
			setState("entered");
			onTransitionEnd?.();
		} else if (styles.height === 0) {
			setStyles(collapsedStyles);
			setState("exited");
			onTransitionEnd?.();
		}
	};
	return {
		state,
		getCollapseProps: (input) => ({
			"aria-hidden": !expanded,
			inert: !expanded,
			ref: mergeRefs(elementRef, input?.ref),
			onTransitionEnd: handleTransitionEnd,
			style: {
				boxSizing: "border-box",
				...input?.style,
				...styles
			}
		})
	};
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-collapse/use-horizontal-collapse.mjs
function getAutoWidthDuration(width) {
	if (!width || typeof width === "string") return 0;
	const constant = width / 36;
	return Math.round((4 + 15 * constant ** .25 + constant / 5) * 10);
}
function getElementWidth(elementRef) {
	return elementRef.current ? elementRef.current.scrollWidth : "auto";
}
function useHorizontalCollapse({ transitionDuration, transitionTimingFunction = "ease", onTransitionEnd, onTransitionStart, expanded, keepMounted }) {
	const collapsedStyles = {
		width: 0,
		overflow: "hidden",
		...keepMounted ? {} : { display: "none" }
	};
	const onTransitionStartEvent = (0, import_react.useEffectEvent)(() => onTransitionStart?.());
	const elementRef = (0, import_react.useRef)(null);
	const [styles, setStylesRaw] = (0, import_react.useState)(expanded ? {} : collapsedStyles);
	const [state, setState] = (0, import_react.useState)(expanded ? "entered" : "exited");
	const setStyles = (newStyles) => {
		(0, import_react_dom.flushSync)(() => setStylesRaw(newStyles));
	};
	const mergeStyles = (newStyles) => {
		setStyles((oldStyles) => ({
			...oldStyles,
			...newStyles
		}));
	};
	const getTransitionStyles = (width) => {
		const duration = transitionDuration ?? getAutoWidthDuration(width);
		return { transition: `width ${duration}ms ${transitionTimingFunction}, opacity ${duration}ms ${transitionTimingFunction}` };
	};
	useDidUpdate(() => {
		if (transitionDuration !== 0) onTransitionStartEvent();
		if (expanded) window.requestAnimationFrame(() => {
			(0, import_react_dom.flushSync)(() => setState("entering"));
			mergeStyles({
				willChange: "width",
				display: "block",
				overflow: "hidden"
			});
			window.requestAnimationFrame(() => {
				const width = getElementWidth(elementRef);
				mergeStyles({
					...getTransitionStyles(width),
					width
				});
			});
		});
		else window.requestAnimationFrame(() => {
			(0, import_react_dom.flushSync)(() => setState("exiting"));
			const width = getElementWidth(elementRef);
			mergeStyles({
				...getTransitionStyles(width),
				willChange: "width",
				width
			});
			window.requestAnimationFrame(() => mergeStyles({
				width: 0,
				overflow: "hidden"
			}));
		});
	}, [expanded]);
	const handleTransitionEnd = (event) => {
		if (event.target !== elementRef.current || event.propertyName !== "width") return;
		if (expanded) {
			const width = getElementWidth(elementRef);
			if (width === styles.width) setStyles({});
			else mergeStyles({ width });
			setState("entered");
			onTransitionEnd?.();
		} else if (styles.width === 0) {
			setStyles(collapsedStyles);
			setState("exited");
			onTransitionEnd?.();
		}
	};
	return {
		state,
		getCollapseProps: (input) => ({
			"aria-hidden": !expanded,
			inert: !expanded,
			ref: mergeRefs(elementRef, input?.ref),
			onTransitionEnd: handleTransitionEnd,
			style: {
				boxSizing: "border-box",
				...input?.style,
				...styles
			}
		})
	};
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-mask/use-mask.mjs
var DEFAULT_TOKENS = {
	"9": /[0-9]/,
	a: /[A-Za-z]/,
	A: /[A-Z]/,
	"*": /[A-Za-z0-9]/,
	"#": /[-+0-9]/
};
function parseMask(mask, tokens) {
	if (Array.isArray(mask)) return mask.map((item) => {
		if (item instanceof RegExp) return {
			type: "token",
			char: "_",
			pattern: item
		};
		return {
			type: "literal",
			char: item
		};
	});
	const slots = [];
	let optional = false;
	for (let i = 0; i < mask.length; i++) {
		const char = mask[i];
		if (char === "\\" && i + 1 < mask.length) {
			i++;
			slots.push({
				type: "literal",
				char: mask[i]
			});
			continue;
		}
		if (char === "?") {
			optional = true;
			continue;
		}
		if (tokens[char]) slots.push({
			type: "token",
			char,
			pattern: tokens[char],
			optional
		});
		else slots.push({
			type: "literal",
			char,
			optional
		});
	}
	return slots;
}
function getSlotChar(slotCharOption, index) {
	if (slotCharOption === null || slotCharOption === "" || slotCharOption === void 0) return "";
	if (slotCharOption.length > 1) return slotCharOption[index] || "_";
	return slotCharOption;
}
function applyMaskToRaw(raw, slots, _slotCharOption, transform) {
	let result = "";
	let rawIndex = 0;
	let slotIndex = 0;
	for (slotIndex = 0; slotIndex < slots.length; slotIndex++) {
		const slot = slots[slotIndex];
		if (slot.type === "literal") result += slot.char;
		else if (rawIndex < raw.length) {
			const ch = transform ? transform(raw[rawIndex]) : raw[rawIndex];
			if (slot.pattern && slot.pattern.test(ch)) {
				result += ch;
				rawIndex++;
			} else {
				rawIndex++;
				slotIndex--;
			}
		} else break;
	}
	return result;
}
function buildDisplayValue(value, slots, slotCharOption, showSlots) {
	if (!showSlots) return value;
	let display = value;
	for (let i = value.length; i < slots.length; i++) {
		const slot = slots[i];
		if (slot.type === "literal") display += slot.char;
		else {
			const sc = getSlotChar(slotCharOption, i);
			if (!sc) break;
			display += sc;
		}
	}
	return display;
}
function extractRaw(masked, slots) {
	let raw = "";
	for (let i = 0; i < masked.length && i < slots.length; i++) if (slots[i].type === "token") raw += masked[i];
	return raw;
}
function checkComplete(masked, slots) {
	for (let i = 0; i < slots.length; i++) if (slots[i].type === "token" && !slots[i].optional) {
		if (i >= masked.length) return false;
		if (!slots[i].pattern.test(masked[i])) return false;
	}
	return true;
}
function findNextTokenIndex(slots, from) {
	for (let i = from; i < slots.length; i++) if (slots[i].type === "token") return i;
	return slots.length;
}
function findPrevTokenIndex(slots, from) {
	for (let i = from; i >= 0; i--) if (slots[i].type === "token") return i;
	return -1;
}
function processInput(inputValue, slots, _slotCharOption) {
	let result = "";
	let inputIndex = 0;
	for (let slotIndex = 0; slotIndex < slots.length && inputIndex <= inputValue.length; slotIndex++) {
		const slot = slots[slotIndex];
		if (slot.type === "literal") {
			result += slot.char;
			if (inputIndex < inputValue.length && inputValue[inputIndex] === slot.char) inputIndex++;
			continue;
		}
		if (inputIndex >= inputValue.length) break;
		while (inputIndex < inputValue.length) {
			const ch = inputValue[inputIndex];
			inputIndex++;
			if (slot.pattern.test(ch)) {
				result += ch;
				break;
			}
		}
		if (result.length <= slotIndex) break;
	}
	return result;
}
function getResolvedOptions(options, rawValue) {
	const tokens = {
		...DEFAULT_TOKENS,
		...options.tokens
	};
	let mask = options.mask;
	let slotChar = options.slotChar === void 0 ? "_" : options.slotChar;
	let separate = options.separate ?? false;
	if (options.modify) {
		const overrides = options.modify(rawValue);
		if (overrides) {
			if (overrides.mask !== void 0) mask = overrides.mask;
			if (overrides.tokens !== void 0) Object.assign(tokens, overrides.tokens);
			if (overrides.slotChar !== void 0) slotChar = overrides.slotChar;
			if (overrides.separate !== void 0) separate = overrides.separate;
		}
	}
	return {
		slots: parseMask(mask, tokens),
		slotChar,
		separate,
		tokens,
		transform: options.transform
	};
}
function formatMask(raw, options) {
	const { slots, slotChar, transform } = getResolvedOptions(options, raw);
	return applyMaskToRaw(raw, slots, slotChar, transform);
}
function unformatMask(masked, options) {
	const { slots } = getResolvedOptions(options, "");
	return extractRaw(masked, slots);
}
function isMaskComplete(masked, options) {
	const { slots } = getResolvedOptions(options, "");
	return checkComplete(masked, slots);
}
function generatePattern(mode, options) {
	const { slots } = getResolvedOptions(options, "");
	let pattern = "";
	for (const slot of slots) if (slot.type === "literal") pattern += slot.char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	else {
		const src = slot.pattern.source;
		if (mode === "full-inexact") pattern += slot.optional ? `${src}?` : src;
		else pattern += slot.optional ? `(${src})?` : `(${src})`;
	}
	return pattern;
}
function useMask(options) {
	const optionsRef = (0, import_react.useRef)(options);
	optionsRef.current = options;
	const inputRef = (0, import_react.useRef)(null);
	const [maskedValue, setMaskedValue] = (0, import_react.useState)("");
	const [rawValue, setRawValue] = (0, import_react.useState)("");
	const processedRef = (0, import_react.useRef)("");
	const wasCompleteRef = (0, import_react.useRef)(false);
	const isFocusedRef = (0, import_react.useRef)(false);
	const getOptions = (0, import_react.useCallback)(() => {
		const opts = optionsRef.current;
		return getResolvedOptions(opts, rawValue);
	}, [rawValue]);
	const updateValue = (0, import_react.useCallback)((newMasked, cursorPos) => {
		const opts = optionsRef.current;
		const { slots } = getResolvedOptions(opts, extractRaw(newMasked, getResolvedOptions(opts, "").slots));
		const { slots: resolvedSlots, slotChar } = getResolvedOptions(opts, extractRaw(newMasked, slots));
		const reprocessed = processInput(newMasked, resolvedSlots, slotChar);
		const newRaw = extractRaw(reprocessed, resolvedSlots);
		const showSlots = opts.alwaysShowMask || isFocusedRef.current;
		const showOnFocus = opts.showMaskOnFocus !== false;
		const displayValue = buildDisplayValue(reprocessed, resolvedSlots, slotChar, showSlots && (showOnFocus || reprocessed.length > 0));
		processedRef.current = reprocessed;
		setMaskedValue(displayValue);
		setRawValue(newRaw);
		if (inputRef.current) {
			inputRef.current.value = displayValue;
			if (cursorPos !== void 0 && document.activeElement === inputRef.current) {
				const pos = Math.min(cursorPos, reprocessed.length);
				inputRef.current.setSelectionRange(pos, pos);
			}
		}
		if (opts.onChangeRaw) opts.onChangeRaw(newRaw, displayValue);
		const complete = checkComplete(reprocessed, resolvedSlots);
		if (complete && !wasCompleteRef.current && opts.onComplete) opts.onComplete(displayValue, newRaw);
		wasCompleteRef.current = complete;
		return {
			displayValue,
			newRaw,
			reprocessed,
			resolvedSlots
		};
	}, [getOptions]);
	const handleInput = (0, import_react.useCallback)((e) => {
		const input = e.target;
		const opts = optionsRef.current;
		const { slots: resolvedSlots, slotChar, transform } = getResolvedOptions(opts, "");
		const reformatted = applyMaskToRaw(extractRaw(input.value, resolvedSlots), resolvedSlots, slotChar, transform);
		updateValue(reformatted, reformatted.length);
	}, [updateValue]);
	const clampCursorToProcessed = (0, import_react.useCallback)((input) => {
		const start = input.selectionStart ?? 0;
		if (start !== (input.selectionEnd ?? 0)) return;
		const opts = optionsRef.current;
		const { slots } = getResolvedOptions(opts, "");
		const processed = processedRef.current;
		const endPos = processed.length > 0 ? findNextEditablePosition(processed.length, slots, processed) : findNextTokenIndex(slots, 0);
		const startPos = findNextTokenIndex(slots, 0);
		if (start > endPos || start < startPos) input.setSelectionRange(endPos, endPos);
	}, []);
	const handleFocus = (0, import_react.useCallback)(() => {
		isFocusedRef.current = true;
		const opts = optionsRef.current;
		const input = inputRef.current;
		if (!input) return;
		const { slots, slotChar } = getResolvedOptions(opts, "");
		const showOnFocus = opts.showMaskOnFocus !== false;
		const processed = processedRef.current;
		if (showOnFocus || opts.alwaysShowMask) {
			const display = buildDisplayValue(processed, slots, slotChar, true);
			input.value = display;
			setMaskedValue(display);
		}
		requestAnimationFrame(() => {
			if (input === document.activeElement) clampCursorToProcessed(input);
		});
	}, [clampCursorToProcessed]);
	const handleMouseUp = (0, import_react.useCallback)(() => {
		const input = inputRef.current;
		if (!input || input !== document.activeElement) return;
		clampCursorToProcessed(input);
	}, [clampCursorToProcessed]);
	const handleMouseDown = (0, import_react.useCallback)(() => {
		const input = inputRef.current;
		if (!input) return;
		requestAnimationFrame(() => {
			if (input !== document.activeElement) return;
			const start = input.selectionStart ?? 0;
			if (start !== (input.selectionEnd ?? 0)) return;
			const opts = optionsRef.current;
			const { slots } = getResolvedOptions(opts, "");
			const processed = processedRef.current;
			const endPos = processed.length > 0 ? findNextEditablePosition(processed.length, slots, processed) : findNextTokenIndex(slots, 0);
			if (start > endPos) input.setSelectionRange(endPos, endPos);
		});
	}, []);
	const handleBlur = (0, import_react.useCallback)(() => {
		isFocusedRef.current = false;
		const opts = optionsRef.current;
		const input = inputRef.current;
		if (!input) return;
		const { slots, slotChar } = getResolvedOptions(opts, rawValue);
		const expectedFocusDisplay = buildDisplayValue(processedRef.current, slots, slotChar, true);
		const processed = input.value === expectedFocusDisplay ? processedRef.current : processInput(input.value, slots, slotChar);
		const complete = checkComplete(processed, slots);
		if (opts.autoClear && !complete && processed.length > 0) {
			input.value = "";
			processedRef.current = "";
			setMaskedValue("");
			setRawValue("");
			wasCompleteRef.current = false;
			if (opts.onChangeRaw) opts.onChangeRaw("", "");
			if (opts.alwaysShowMask) {
				const emptyDisplay = buildDisplayValue("", slots, slotChar, true);
				input.value = emptyDisplay;
				setMaskedValue(emptyDisplay);
			}
			return;
		}
		if (!opts.alwaysShowMask && !complete) {
			if (extractRaw(processed, slots).length === 0) {
				input.value = "";
				processedRef.current = "";
				setMaskedValue("");
				setRawValue("");
				wasCompleteRef.current = false;
				if (opts.onChangeRaw) opts.onChangeRaw("", "");
				return;
			}
			const display = buildDisplayValue(processed, slots, slotChar, false);
			input.value = display;
			setMaskedValue(display);
		}
	}, [rawValue]);
	const handleKeyDown = (0, import_react.useCallback)((e) => {
		const input = e.target;
		const opts = optionsRef.current;
		const { slots, slotChar, transform } = getResolvedOptions(opts, rawValue);
		const start = input.selectionStart ?? 0;
		const end = input.selectionEnd ?? 0;
		const processed = processedRef.current;
		if (e.key === "Backspace") {
			e.preventDefault();
			if (e.metaKey || e.ctrlKey && !e.altKey) {
				const clampedStart = Math.min(start, processed.length);
				updateValue(applyMaskToRaw(extractRaw(processed.slice(clampedStart), slots.slice(clampedStart)), slots, slotChar, transform), 0);
				return;
			}
			if (start !== end) {
				const clampedEnd = Math.min(end, processed.length);
				const before = processed.slice(0, start);
				const afterRaw = extractRaw(processed.slice(clampedEnd), slots.slice(clampedEnd));
				updateValue(applyMaskToRaw(extractRaw(before, slots) + afterRaw, slots, slotChar, transform), start);
				return;
			}
			if (start === 0) return;
			let deletePos = start - 1;
			while (deletePos >= 0 && slots[deletePos] && slots[deletePos].type === "literal") deletePos--;
			if (deletePos < 0) return;
			updateValue(applyMaskToRaw(extractRaw(processed.slice(0, deletePos), slots.slice(0, deletePos)) + extractRaw(processed.slice(deletePos + 1), slots.slice(deletePos + 1)), slots, slotChar, transform), deletePos);
		} else if (e.key === "Delete") {
			e.preventDefault();
			if (start !== end) {
				const clampedEnd = Math.min(end, processed.length);
				const before = processed.slice(0, start);
				const afterRaw = extractRaw(processed.slice(clampedEnd), slots.slice(clampedEnd));
				updateValue(applyMaskToRaw(extractRaw(before, slots) + afterRaw, slots, slotChar, transform), start);
				return;
			}
			let deletePos = start;
			while (deletePos < slots.length && slots[deletePos] && slots[deletePos].type === "literal") deletePos++;
			if (deletePos >= processed.length) return;
			updateValue(applyMaskToRaw(extractRaw(processed.slice(0, start), slots.slice(0, start)) + extractRaw(processed.slice(deletePos + 1), slots.slice(deletePos + 1)), slots, slotChar, transform), start);
		} else if (e.key === "ArrowRight" && !e.shiftKey) {
			const nextPos = findNextEditablePosition(start + 1, slots, input.value);
			if (nextPos !== start + 1) {
				e.preventDefault();
				input.setSelectionRange(nextPos, nextPos);
			}
		} else if (e.key === "ArrowLeft" && !e.shiftKey) {
			if (start > 0) {
				const prevToken = findPrevTokenIndex(slots, start - 1);
				if (prevToken >= 0 && prevToken !== start - 1) {
					e.preventDefault();
					input.setSelectionRange(prevToken + 1, prevToken + 1);
				}
			}
		} else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
			e.preventDefault();
			let insertPos = Math.min(start, processed.length);
			while (insertPos < slots.length && slots[insertPos] && slots[insertPos].type === "literal") insertPos++;
			if (insertPos >= slots.length) return;
			const slot = slots[insertPos];
			const ch = transform ? transform(e.key) : e.key;
			if (!slot.pattern.test(ch)) return;
			const beforeRaw = extractRaw(processed.slice(0, insertPos), slots.slice(0, insertPos));
			const afterRaw = start < end ? extractRaw(processed.slice(Math.min(end, processed.length)), slots.slice(Math.min(end, processed.length))) : extractRaw(processed.slice(insertPos), slots.slice(insertPos));
			const newValue = applyMaskToRaw(beforeRaw + ch + afterRaw, slots, slotChar, transform);
			updateValue(newValue, findNextEditablePosition(insertPos + 1, slots, newValue));
		}
	}, [rawValue, updateValue]);
	const handlePaste = (0, import_react.useCallback)((e) => {
		e.preventDefault();
		const input = e.target;
		const opts = optionsRef.current;
		const pastedText = e.clipboardData?.getData("text") ?? "";
		const start = input.selectionStart ?? 0;
		const end = input.selectionEnd ?? 0;
		const processed = processedRef.current;
		const { slots, slotChar, transform } = getResolvedOptions(opts, "");
		const clampedEnd = Math.min(end, processed.length);
		const beforeRaw = extractRaw(processed.slice(0, start), slots.slice(0, start));
		const afterRaw = extractRaw(processed.slice(clampedEnd), slots.slice(clampedEnd));
		const newValue = applyMaskToRaw(beforeRaw + pastedText + afterRaw, slots, slotChar, transform);
		const { reprocessed } = updateValue(newValue);
		const pasteEndPos = Math.min((reprocessed || newValue).length, slots.length);
		if (input === document.activeElement) input.setSelectionRange(pasteEndPos, pasteEndPos);
	}, [updateValue]);
	const setAriaAttributes = (0, import_react.useCallback)((input) => {
		if (optionsRef.current.invalid) input.setAttribute("aria-invalid", "true");
		else input.removeAttribute("aria-invalid");
	}, []);
	const refCallback = (0, import_react.useCallback)((node) => {
		const prevInput = inputRef.current;
		if (prevInput) {
			prevInput.removeEventListener("input", handleInput);
			prevInput.removeEventListener("focus", handleFocus);
			prevInput.removeEventListener("blur", handleBlur);
			prevInput.removeEventListener("mousedown", handleMouseDown);
			prevInput.removeEventListener("mouseup", handleMouseUp);
			prevInput.removeEventListener("keydown", handleKeyDown);
			prevInput.removeEventListener("paste", handlePaste);
		}
		inputRef.current = node;
		if (node) {
			node.addEventListener("input", handleInput);
			node.addEventListener("focus", handleFocus);
			node.addEventListener("blur", handleBlur);
			node.addEventListener("mousedown", handleMouseDown);
			node.addEventListener("mouseup", handleMouseUp);
			node.addEventListener("keydown", handleKeyDown);
			node.addEventListener("paste", handlePaste);
			setAriaAttributes(node);
			if (options.alwaysShowMask && !node.value) {
				const { slots, slotChar } = getResolvedOptions(options, "");
				const display = buildDisplayValue("", slots, slotChar, true);
				node.value = display;
				setMaskedValue(display);
			}
		}
	}, [
		handleInput,
		handleFocus,
		handleBlur,
		handleMouseDown,
		handleMouseUp,
		handleKeyDown,
		handlePaste,
		setAriaAttributes,
		options
	]);
	(0, import_react.useEffect)(() => {
		const input = inputRef.current;
		if (!input) return;
		setAriaAttributes(input);
	}, [options.invalid, setAriaAttributes]);
	return {
		ref: refCallback,
		value: maskedValue,
		rawValue,
		isComplete: (() => {
			const { slots } = getOptions();
			return checkComplete(processedRef.current, slots);
		})(),
		reset: (0, import_react.useCallback)(() => {
			const opts = optionsRef.current;
			const input = inputRef.current;
			processedRef.current = "";
			setMaskedValue("");
			setRawValue("");
			wasCompleteRef.current = false;
			if (input) if (opts.alwaysShowMask) {
				const { slots, slotChar } = getResolvedOptions(opts, "");
				const display = buildDisplayValue("", slots, slotChar, true);
				input.value = display;
				setMaskedValue(display);
			} else input.value = "";
			if (opts.onChangeRaw) opts.onChangeRaw("", "");
		}, [])
	};
}
function findNextEditablePosition(from, slots, value) {
	let pos = from;
	while (pos < slots.length && pos < value.length && slots[pos] && slots[pos].type === "literal") pos++;
	return pos;
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-roving-index/use-roving-index.mjs
function findNextEnabled(current, total, isItemDisabled, loop) {
	for (let i = current + 1; i < total; i += 1) if (!isItemDisabled(i)) return i;
	if (loop) {
		for (let i = 0; i < current; i += 1) if (!isItemDisabled(i)) return i;
	}
	return current;
}
function findPreviousEnabled(current, total, isItemDisabled, loop) {
	for (let i = current - 1; i >= 0; i -= 1) if (!isItemDisabled(i)) return i;
	if (loop) {
		for (let i = total - 1; i > current; i -= 1) if (!isItemDisabled(i)) return i;
	}
	return current;
}
function findFirstEnabled(total, isItemDisabled) {
	for (let i = 0; i < total; i += 1) if (!isItemDisabled(i)) return i;
	return 0;
}
function findLastEnabled(total, isItemDisabled) {
	for (let i = total - 1; i >= 0; i -= 1) if (!isItemDisabled(i)) return i;
	return 0;
}
var defaultIsItemDisabled = () => false;
function useRovingIndex(input) {
	const { total, orientation = "horizontal", loop = true, dir = "ltr", activateOnFocus = false, columns, focusedIndex, initialIndex, onFocusChange, isItemDisabled = defaultIsItemDisabled } = input;
	const itemRefs = (0, import_react.useRef)(/* @__PURE__ */ new Map());
	const isGrid = typeof columns === "number" && columns > 0;
	const [activeIndex, setActiveIndex] = useUncontrolled({
		value: focusedIndex,
		defaultValue: initialIndex !== void 0 ? initialIndex : findFirstEnabled(total, isItemDisabled),
		finalValue: 0,
		onChange: onFocusChange
	});
	(0, import_react.useEffect)(() => {
		if (total === 0) return;
		if (activeIndex >= total) setActiveIndex(findLastEnabled(total, isItemDisabled));
		else if (isItemDisabled(activeIndex)) setActiveIndex(findFirstEnabled(total, isItemDisabled));
	}, [
		total,
		activeIndex,
		isItemDisabled
	]);
	const focusItem = (0, import_react.useCallback)((index) => {
		setActiveIndex(index);
		const element = itemRefs.current.get(index);
		if (element) {
			element.focus();
			if (activateOnFocus) element.click();
		}
	}, [activateOnFocus, setActiveIndex]);
	const handleGridKeyDown = (0, import_react.useCallback)((event, currentIndex) => {
		const row = Math.floor(currentIndex / columns);
		const col = currentIndex % columns;
		const totalRows = Math.ceil(total / columns);
		let nextIndex = null;
		const isRtl = dir === "rtl";
		switch (event.key) {
			case "ArrowRight": {
				const targetCol = isRtl ? col - 1 : col + 1;
				if (targetCol >= 0 && targetCol < columns && row * columns + targetCol < total) {
					const candidate = row * columns + targetCol;
					if (!isItemDisabled(candidate)) nextIndex = candidate;
				}
				break;
			}
			case "ArrowLeft": {
				const targetCol = isRtl ? col + 1 : col - 1;
				if (targetCol >= 0 && targetCol < columns && row * columns + targetCol < total) {
					const candidate = row * columns + targetCol;
					if (!isItemDisabled(candidate)) nextIndex = candidate;
				}
				break;
			}
			case "ArrowDown":
				for (let r = row + 1; r < totalRows; r += 1) {
					const candidate = r * columns + col;
					if (candidate < total && !isItemDisabled(candidate)) {
						nextIndex = candidate;
						break;
					}
				}
				break;
			case "ArrowUp":
				for (let r = row - 1; r >= 0; r -= 1) {
					const candidate = r * columns + col;
					if (candidate < total && !isItemDisabled(candidate)) {
						nextIndex = candidate;
						break;
					}
				}
				break;
			case "Home":
				if (event.ctrlKey) nextIndex = findFirstEnabled(total, isItemDisabled);
				else {
					const rowStart = row * columns;
					for (let i = rowStart; i < rowStart + columns && i < total; i += 1) if (!isItemDisabled(i)) {
						nextIndex = i;
						break;
					}
				}
				break;
			case "End":
				if (event.ctrlKey) nextIndex = findLastEnabled(total, isItemDisabled);
				else {
					const rowStart = row * columns;
					const rowEnd = Math.min(rowStart + columns, total) - 1;
					for (let i = rowEnd; i >= rowStart; i -= 1) if (!isItemDisabled(i)) {
						nextIndex = i;
						break;
					}
				}
				break;
		}
		if (nextIndex !== null && nextIndex !== currentIndex) {
			event.preventDefault();
			event.stopPropagation();
			focusItem(nextIndex);
		}
	}, [
		total,
		columns,
		dir,
		isItemDisabled,
		focusItem
	]);
	const handleListKeyDown = (0, import_react.useCallback)((event, currentIndex) => {
		const isRtl = dir === "rtl";
		let nextIndex = null;
		switch (event.key) {
			case "ArrowRight":
				if (orientation === "horizontal" || orientation === "both") nextIndex = isRtl ? findPreviousEnabled(currentIndex, total, isItemDisabled, loop) : findNextEnabled(currentIndex, total, isItemDisabled, loop);
				break;
			case "ArrowLeft":
				if (orientation === "horizontal" || orientation === "both") nextIndex = isRtl ? findNextEnabled(currentIndex, total, isItemDisabled, loop) : findPreviousEnabled(currentIndex, total, isItemDisabled, loop);
				break;
			case "ArrowDown":
				if (orientation === "vertical" || orientation === "both") nextIndex = findNextEnabled(currentIndex, total, isItemDisabled, loop);
				break;
			case "ArrowUp":
				if (orientation === "vertical" || orientation === "both") nextIndex = findPreviousEnabled(currentIndex, total, isItemDisabled, loop);
				break;
			case "Home":
				nextIndex = findFirstEnabled(total, isItemDisabled);
				break;
			case "End":
				nextIndex = findLastEnabled(total, isItemDisabled);
				break;
		}
		if (nextIndex !== null && nextIndex !== currentIndex) {
			event.preventDefault();
			event.stopPropagation();
			focusItem(nextIndex);
		}
	}, [
		total,
		orientation,
		loop,
		dir,
		isItemDisabled,
		focusItem
	]);
	return {
		getItemProps: (0, import_react.useCallback)((options) => {
			const { index, onClick, onKeyDown } = options;
			return {
				tabIndex: index === activeIndex ? 0 : -1,
				ref: (node) => {
					if (node) itemRefs.current.set(index, node);
					else itemRefs.current.delete(index);
				},
				onKeyDown: (event) => {
					onKeyDown?.(event);
					if (event.defaultPrevented) return;
					if (isGrid) handleGridKeyDown(event, index);
					else handleListKeyDown(event, index);
				},
				onClick: (event) => {
					onClick?.(event);
					setActiveIndex(index);
				}
			};
		}, [
			activeIndex,
			isGrid,
			handleGridKeyDown,
			handleListKeyDown,
			setActiveIndex
		]),
		focusedIndex: activeIndex,
		setFocusedIndex: setActiveIndex
	};
}
//#endregion
//#region node_modules/@mantine/hooks/esm/use-drag/use-drag.mjs
var VELOCITY_DECAY_MS = 100;
function sign(n) {
	if (n > 0) return 1;
	if (n < 0) return -1;
	return 0;
}
function getThresholdVector(threshold) {
	const t = threshold ?? 0;
	if (typeof t === "number") return [t, t];
	return t;
}
function createInitialState() {
	return {
		isActive: false,
		pointerId: -1,
		startXY: [0, 0],
		prevXY: [0, 0],
		startTimestamp: 0,
		prevTimestamp: 0,
		thresholdMet: false,
		firstFired: false,
		lockedAxis: null,
		canceled: false,
		lastVelocity: [0, 0]
	};
}
function useDrag(handler, options = {}) {
	const [active, setActive] = (0, import_react.useState)(false);
	const handlerRef = (0, import_react.useRef)(handler);
	handlerRef.current = handler;
	const optionsRef = (0, import_react.useRef)(options);
	optionsRef.current = options;
	const stateRef = (0, import_react.useRef)(createInitialState());
	const documentControllerRef = (0, import_react.useRef)(null);
	return {
		ref: (0, import_react.useCallback)((node) => {
			if (!node) return;
			const elementController = new AbortController();
			const applyAxisConstraint = (v) => {
				const opts = optionsRef.current;
				const s = stateRef.current;
				if (opts.axis === "x") return [v[0], 0];
				if (opts.axis === "y") return [0, v[1]];
				if (opts.axis === "lock") {
					if (s.lockedAxis === null) {
						const t = opts.axisThreshold ?? 1;
						if (Math.abs(v[0]) > t || Math.abs(v[1]) > t) s.lockedAxis = Math.abs(v[0]) >= Math.abs(v[1]) ? "x" : "y";
					}
					if (s.lockedAxis === "x") return [v[0], 0];
					if (s.lockedAxis === "y") return [0, v[1]];
				}
				return v;
			};
			const resetDrag = () => {
				const s = stateRef.current;
				s.isActive = false;
				s.pointerId = -1;
				s.thresholdMet = false;
				s.firstFired = false;
				s.lockedAxis = null;
				s.canceled = false;
				setActive(false);
				document.body.style.userSelect = "";
				document.body.style.webkitUserSelect = "";
				documentControllerRef.current?.abort();
				documentControllerRef.current = null;
			};
			const cancel = () => {
				if (stateRef.current.isActive) {
					stateRef.current.canceled = true;
					resetDrag();
				}
			};
			const activateDrag = () => {
				setActive(true);
				document.body.style.userSelect = "none";
				document.body.style.webkitUserSelect = "none";
			};
			const onPointerDown = (event) => {
				if (optionsRef.current.enabled === false) return;
				if (event.button !== 0) return;
				if (stateRef.current.isActive) return;
				const s = stateRef.current;
				s.isActive = true;
				s.pointerId = event.pointerId;
				s.startXY = [event.clientX, event.clientY];
				s.prevXY = [event.clientX, event.clientY];
				s.startTimestamp = event.timeStamp;
				s.prevTimestamp = event.timeStamp;
				s.thresholdMet = false;
				s.firstFired = false;
				s.lockedAxis = null;
				s.canceled = false;
				s.lastVelocity = [0, 0];
				const [tx, ty] = getThresholdVector(optionsRef.current.threshold);
				if (tx === 0 && ty === 0) {
					s.thresholdMet = true;
					s.firstFired = true;
					activateDrag();
					handlerRef.current({
						xy: [event.clientX, event.clientY],
						initial: [event.clientX, event.clientY],
						movement: [0, 0],
						delta: [0, 0],
						distance: [0, 0],
						direction: [0, 0],
						velocity: [0, 0],
						elapsedTime: 0,
						first: true,
						last: false,
						active: true,
						tap: false,
						canceled: false,
						cancel,
						event
					});
				}
				documentControllerRef.current?.abort();
				documentControllerRef.current = new AbortController();
				const sig = documentControllerRef.current.signal;
				document.addEventListener("pointermove", onPointerMove, { signal: sig });
				document.addEventListener("pointerup", onPointerUp, { signal: sig });
				document.addEventListener("pointercancel", onPointerCancel, { signal: sig });
			};
			const onPointerMove = (event) => {
				const s = stateRef.current;
				if (!s.isActive || event.pointerId !== s.pointerId) return;
				const rawMovement = [event.clientX - s.startXY[0], event.clientY - s.startXY[1]];
				if (!s.thresholdMet) {
					const [tx, ty] = getThresholdVector(optionsRef.current.threshold);
					if (Math.abs(rawMovement[0]) < tx && Math.abs(rawMovement[1]) < ty) {
						s.prevXY = [event.clientX, event.clientY];
						s.prevTimestamp = event.timeStamp;
						return;
					}
					s.thresholdMet = true;
					activateDrag();
				}
				const movement = applyAxisConstraint(rawMovement);
				const delta = applyAxisConstraint([event.clientX - s.prevXY[0], event.clientY - s.prevXY[1]]);
				const timeDelta = event.timeStamp - s.prevTimestamp;
				const velocity = timeDelta > 0 ? [Math.abs(delta[0]) / timeDelta, Math.abs(delta[1]) / timeDelta] : s.lastVelocity;
				s.lastVelocity = velocity;
				const isFirst = !s.firstFired;
				s.firstFired = true;
				s.prevXY = [event.clientX, event.clientY];
				s.prevTimestamp = event.timeStamp;
				handlerRef.current({
					xy: [event.clientX, event.clientY],
					initial: [...s.startXY],
					movement,
					delta,
					distance: [Math.abs(movement[0]), Math.abs(movement[1])],
					direction: [sign(delta[0]), sign(delta[1])],
					velocity,
					elapsedTime: event.timeStamp - s.startTimestamp,
					first: isFirst,
					last: false,
					active: true,
					tap: false,
					canceled: false,
					cancel,
					event
				});
			};
			const onPointerUp = (event) => {
				const s = stateRef.current;
				if (!s.isActive || event.pointerId !== s.pointerId) return;
				const opts = optionsRef.current;
				if (!s.thresholdMet) {
					if (opts.filterTaps) {
						const mov = applyAxisConstraint([event.clientX - s.startXY[0], event.clientY - s.startXY[1]]);
						const dist = [Math.abs(mov[0]), Math.abs(mov[1])];
						const isTap = Math.max(dist[0], dist[1]) < (opts.tapThreshold ?? 3);
						handlerRef.current({
							xy: [event.clientX, event.clientY],
							initial: [...s.startXY],
							movement: mov,
							delta: mov,
							distance: dist,
							direction: [sign(mov[0]), sign(mov[1])],
							velocity: [0, 0],
							elapsedTime: event.timeStamp - s.startTimestamp,
							first: true,
							last: true,
							active: false,
							tap: isTap,
							canceled: false,
							cancel,
							event
						});
					}
					resetDrag();
					return;
				}
				const movement = applyAxisConstraint([event.clientX - s.startXY[0], event.clientY - s.startXY[1]]);
				const distance = [Math.abs(movement[0]), Math.abs(movement[1])];
				const delta = applyAxisConstraint([event.clientX - s.prevXY[0], event.clientY - s.prevXY[1]]);
				const velocity = event.timeStamp - s.prevTimestamp > VELOCITY_DECAY_MS ? [0, 0] : s.lastVelocity;
				const maxDistance = Math.max(distance[0], distance[1]);
				const tap = opts.filterTaps === true && maxDistance < (opts.tapThreshold ?? 3);
				handlerRef.current({
					xy: [event.clientX, event.clientY],
					initial: [...s.startXY],
					movement,
					delta,
					distance,
					direction: [sign(delta[0]), sign(delta[1])],
					velocity,
					elapsedTime: event.timeStamp - s.startTimestamp,
					first: !s.firstFired,
					last: true,
					active: false,
					tap,
					canceled: false,
					cancel,
					event
				});
				resetDrag();
			};
			const onPointerCancel = (event) => {
				const s = stateRef.current;
				if (!s.isActive || event.pointerId !== s.pointerId) return;
				const movement = applyAxisConstraint([event.clientX - s.startXY[0], event.clientY - s.startXY[1]]);
				handlerRef.current({
					xy: [event.clientX, event.clientY],
					initial: [...s.startXY],
					movement,
					delta: [0, 0],
					distance: [Math.abs(movement[0]), Math.abs(movement[1])],
					direction: [0, 0],
					velocity: [0, 0],
					elapsedTime: event.timeStamp - s.startTimestamp,
					first: !s.firstFired,
					last: true,
					active: false,
					tap: false,
					canceled: true,
					cancel,
					event
				});
				resetDrag();
			};
			node.addEventListener("pointerdown", onPointerDown, { signal: elementController.signal });
			return () => {
				elementController.abort();
				documentControllerRef.current?.abort();
				documentControllerRef.current = null;
				if (stateRef.current.isActive) {
					stateRef.current.isActive = false;
					setActive(false);
					document.body.style.userSelect = "";
					document.body.style.webkitUserSelect = "";
				}
			};
		}, []),
		active
	};
}
//#endregion
export { useIntersection as $, useInViewport as A, useFocusReturn as At, useDisclosure as B, useClipboard as Bt, useThrottledCallback as C, useWindowEvent as Ct, useMounted as D, useId$1 as Dt, useStateHistory as E, useIdle as Et, usePrevious as F, useDebouncedValue as Ft, useValidatedState as G, shallowEqual as Gt, useInputState as H, useDebouncedCallback as Ht, useTextSelection as I, useDebouncedState as It, useFullscreenDocument as J, lowerFirst as Jt, useHover as K, range$1 as Kt, useTimeout as L, useCounter as Lt, useHeadroom as M, useDocumentVisibility as Mt, useScrollDirection as N, useDocumentTitle as Nt, useMutationObserver as O, useForceUpdate as Ot, useFavicon as P, useIsomorphicEffect as Pt, useHash as Q, useNetwork as R, useColorScheme as Rt, useThrottledState as S, useLocalStorage as St, useMap as T, useInterval as Tt, useSetState as U, useCallbackRef as Ut, useEventListener as V, useClickOutside as Vt, useOs as W, upperFirst as Wt, useHotkeys as X, useFullscreenElement as Y, clamp as Yt, getHotkeyHandler as Z, useRadialMove as _, mergeRefs as _t, isMaskComplete as a, useResizeObserver as at, useIsFirstRender as b, useSessionStorage as bt, useHorizontalCollapse as c, usePageLeave as ct, useSelection as d, useUncontrolled as dt, useWindowScroll as et, useLongPress as f, clampUseMovePosition as ft, normalizeRadialValue as g, assignRef as gt, useScrollSpy as h, useMousePosition as ht, generatePattern as i, useElementSize as it, useEyeDropper as j, useDidUpdate as jt, useMutationObserverTarget as k, useFocusTrap as kt, useCollapse as l, useQueue as lt, useScroller as m, useMouse as mt, useRovingIndex as n, useToggle as nt, unformatMask as o, useScrollIntoView as ot, useFileDialog as p, useMove as pt, useLogger as q, randomId as qt, formatMask as r, useShallowEffect as rt, useMask as s, useReducedMotion as st, useDrag as t, useViewportSize as tt, useFloatingWindow as u, usePagination as ut, useFetch as v, useMergedRef as vt, useSet as w, useListState as wt, useThrottledValue as x, readLocalStorageValue as xt, useOrientation as y, readSessionStorageValue as yt, useFocusWithin as z, useMediaQuery as zt };

//# sourceMappingURL=esm-DhakALxu.js.map