import { useState, useRef, useEffect } from "react";
import { Title, TextInput, ActionIcon, Group, Tooltip } from "@mantine/core";
import { IconPencil, IconCheck, IconX } from "@tabler/icons-react";

interface Props {
  value: string;
  order?: 1 | 2 | 3 | 4 | 5 | 6;
  canEdit: boolean;
  onSave: (name: string) => Promise<void>;
}

export function EditableTitle({ value, order = 2, canEdit, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <Group gap={6} align="center" style={{ flex: 1 }}>
        <TextInput
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          size="md"
          style={{ flex: 1 }}
          disabled={saving}
          autoFocus
        />
        <Tooltip label="Save">
          <ActionIcon onClick={commit} loading={saving} variant="light" color="green">
            <IconCheck size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Cancel">
          <ActionIcon onClick={cancel} variant="subtle" disabled={saving}>
            <IconX size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    );
  }

  return (
    <Group gap={6} align="center">
      <Title order={order}>{value}</Title>
      {canEdit && (
        <Tooltip label="Rename">
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={() => setEditing(true)}
            style={{ opacity: 0.5 }}
          >
            <IconPencil size={14} />
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  );
}
