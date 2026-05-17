import { useState, useEffect } from "react";
import { Modal, Stack, Text, Group, Button, Tooltip, useMantineColorScheme } from "@mantine/core";

export const SCOPE_COLORS: { value: string; label: string }[] = [
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#eab308", label: "Yellow" },
  { value: "#84cc16", label: "Lime" },
  { value: "#22c55e", label: "Green" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#0ea5e9", label: "Sky" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#6366f1", label: "Indigo" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#a855f7", label: "Purple" },
  { value: "#ec4899", label: "Pink" },
  { value: "#f43f5e", label: "Rose" },
  { value: "#64748b", label: "Slate" },
];

function ColorPalette({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (c: string | null) => void;
}) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 8 }}>
      {SCOPE_COLORS.map((c) => {
        const selected = value === c.value;
        return (
          <Tooltip key={c.value} label={c.label} withArrow>
            <div
              onClick={() => onChange(selected ? null : c.value)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                backgroundColor: c.value,
                cursor: "pointer",
                boxSizing: "border-box",
                border: selected
                  ? `3px solid ${isDark ? "#fff" : "#000"}`
                  : "3px solid transparent",
                outline: selected ? `2px solid ${c.value}` : "none",
                outlineOffset: 1,
                transition: "transform 0.1s",
                transform: selected ? "scale(1.15)" : "scale(1)",
              }}
            />
          </Tooltip>
        );
      })}
    </div>
  );
}

interface Props {
  opened: boolean;
  onClose: () => void;
  currentColor: string | null | undefined;
  onSave: (color: string | null) => void;
  isPending: boolean;
  error?: unknown;
}

export function ScopeSettingsModal({
  opened,
  onClose,
  currentColor,
  onSave,
  isPending,
  error,
}: Props) {
  const [selectedColor, setSelectedColor] = useState<string | null>(currentColor ?? null);

  useEffect(() => {
    if (opened) setSelectedColor(currentColor ?? null);
  }, [opened]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal opened={opened} onClose={onClose} title="Scope settings" centered size="sm">
      <Stack>
        <Text size="sm" fw={500}>
          Colour
        </Text>
        <Text size="xs" c="dimmed">
          Click a colour to apply it; click again to remove it.
        </Text>
        <ColorPalette value={selectedColor} onChange={setSelectedColor} />
        {error != null && (
          <Text size="sm" c="red">
            {String(error)}
          </Text>
        )}
        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(selectedColor)} loading={isPending}>
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
