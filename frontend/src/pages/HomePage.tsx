import { useQuery } from "@tanstack/react-query";
import { getConversations } from "../lib/api";

export function HomePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => getConversations(),
    retry: false,
  });

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p style={{ color: "red", padding: "2rem" }}>Error: {String(error)}</p>;

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Conversations</h1>
      {data?.length === 0 && <p>No conversations yet.</p>}
      <ul>
        {data?.map((c) => (
          <li key={c.id}>
            <strong>{c.title}</strong> — {c.conversation_timestamp}
          </li>
        ))}
      </ul>
    </main>
  );
}
