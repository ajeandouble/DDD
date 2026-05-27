import { Card, Text } from "@mantine/core";

interface Props {
  name: string;
  color?: string | null;
  onClick: () => void;
}

export function ScopeCard({ name, color, onClick }: Props) {
  return (
    <Card
      shadow="sm"
      padding="md"
      radius="md"
      withBorder
      style={{
        cursor: "pointer",
        borderLeft: color ? `4px solid ${color}` : undefined,
        background: color ? `${color}18` : undefined,
        transition: "background 0.15s",
      }}
      onClick={onClick}
    >
      <Text fw={500}>{name}</Text>
    </Card>
  );
}
