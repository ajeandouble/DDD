import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Stack,
  Title,
  Text,
  Group,
  Badge,
  Switch,
  Button,
  Collapse,
  Card,
  Code,
  Loader,
  ScrollArea,
  ActionIcon,
  Tooltip,
  Box,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import cronstrue from "cronstrue/i18n";
import {
  listSchedulerJobs,
  updateSchedulerJob,
  triggerSchedulerJob,
  listJobRuns,
  type CronJobResponse,
} from "../lib/api";

function cronHint(expr: string, locale: string): string {
  try {
    return cronstrue.toString(expr, {
      locale,
      use24HourTimeFormat: true,
      throwExceptionOnParseError: true,
    });
  } catch {
    return expr;
  }
}

function isValidField(val: string, lo: number, hi: number): boolean {
  if (val === "*") return true;
  if (val.includes("/")) {
    const [range, stepStr] = val.split("/");
    const step = parseInt(stepStr);
    if (isNaN(step) || step < 1) return false;
    return range === "*" || isValidField(range, lo, hi);
  }
  if (val.includes(",")) return val.split(",").every((v) => isValidField(v.trim(), lo, hi));
  if (val.includes("-")) {
    const [aStr, bStr] = val.split("-");
    const a = parseInt(aStr),
      b = parseInt(bStr);
    return !isNaN(a) && !isNaN(b) && a >= lo && b <= hi && a <= b;
  }
  const n = parseInt(val);
  return !isNaN(n) && n >= lo && n <= hi;
}

function isValidCron(expr: string): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [min, hour, dom, month, dow] = parts;
  return (
    isValidField(min, 0, 59) &&
    isValidField(hour, 0, 23) &&
    isValidField(dom, 1, 31) &&
    isValidField(month, 1, 12) &&
    isValidField(dow, 0, 6)
  );
}

const CRON_FIELDS = [
  { label: "minute", range: "0–59" },
  { label: "hour", range: "0–23" },
  { label: "day", range: "1–31" },
  { label: "month", range: "1–12" },
  { label: "weekday", range: "0=sun…6=sat" },
];

function CronEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const {
    t,
    i18n: { language },
  } = useTranslation();
  const firstRef = useRef<HTMLInputElement>(null);

  // Draft state allows empty fields mid-edit without snapping back to "*"
  const [drafts, setDrafts] = useState<string[]>(() =>
    value
      .trim()
      .split(/\s+/)
      .slice(0, 5)
      .map((v) => v ?? "*")
  );

  const assembled = drafts.map((d) => d.trim() || "*").join(" ");
  const valid = isValidCron(assembled);
  const hint = valid ? cronHint(assembled, language) : t("scheduler.invalidCron");

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  const handleChange = (i: number, v: string) => {
    const next = [...drafts];
    next[i] = v;
    setDrafts(next);
    onChange(next.map((d) => d.trim() || "*").join(" "));
  };

  const handleBlur = (i: number) => {
    if (!drafts[i].trim()) {
      const next = [...drafts];
      next[i] = "*";
      setDrafts(next);
      onChange(next.map((d) => d.trim() || "*").join(" "));
    }
  };

  return (
    <Stack gap="sm" mt="sm">
      <Box
        style={{
          background: "var(--mantine-color-default)",
          border: "1px solid var(--mantine-color-default-border)",
          borderRadius: "var(--mantine-radius-md)",
          padding: "16px 24px 14px",
          display: "inline-block",
        }}
      >
        <Group gap={28} align="flex-start" wrap="nowrap">
          {CRON_FIELDS.map((f, i) => (
            <Stack key={f.label} gap={4} align="center">
              <input
                ref={i === 0 ? firstRef : undefined}
                value={drafts[i]}
                onChange={(e) => handleChange(i, e.target.value)}
                onBlur={() => handleBlur(i)}
                spellCheck={false}
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${valid ? "var(--mantine-color-blue-5)" : "var(--mantine-color-red-5)"}`,
                  outline: "none",
                  fontFamily: "monospace",
                  fontSize: 24,
                  fontWeight: 700,
                  color: valid ? "var(--mantine-color-blue-text)" : "var(--mantine-color-red-text)",
                  width: `${Math.max((drafts[i] ?? "").length, 2) + 1}ch`,
                  minWidth: "3ch",
                  textAlign: "center",
                  padding: "0 2px 4px",
                }}
              />
              <Text
                size="xs"
                fw={600}
                c="dimmed"
                style={{ userSelect: "none", fontFamily: "monospace", letterSpacing: "0.03em" }}
              >
                {f.label}
              </Text>
              <Text
                size="xs"
                c="dimmed"
                style={{ userSelect: "none", fontFamily: "monospace", opacity: 0.55, fontSize: 10 }}
              >
                {f.range}
              </Text>
            </Stack>
          ))}
        </Group>
      </Box>

      <Text size="sm" fw={500} c={valid ? "var(--mantine-color-text)" : "red"} ff="monospace">
        {hint}
      </Text>

      <Group gap="lg">
        {(
          [
            ["*", t("scheduler.refAny")],
            [",", t("scheduler.refList")],
            ["-", t("scheduler.refRange")],
            ["/", t("scheduler.refStep")],
          ] as [string, string][]
        ).map(([sym, desc]) => (
          <Group key={sym} gap={6}>
            <Text ff="monospace" fw={700} c="blue" size="sm">
              {sym}
            </Text>
            <Text size="xs" c="dimmed">
              {desc}
            </Text>
          </Group>
        ))}
      </Group>
    </Stack>
  );
}

function statusColor(status: string) {
  if (status === "success") return "green";
  if (status === "failed") return "red";
  return "yellow";
}

function JobRunHistory({ jobId }: { jobId: string }) {
  const { t } = useTranslation();
  const { data: runs, isLoading } = useQuery({
    queryKey: ["job-runs", jobId],
    queryFn: () => listJobRuns(jobId),
    refetchInterval: 3000,
  });
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) return <Loader size="xs" />;
  if (!runs?.length)
    return (
      <Text size="xs" c="dimmed">
        {t("scheduler.noRuns")}
      </Text>
    );

  return (
    <Stack gap={4}>
      {runs.map((run) => (
        <Card key={run.id} withBorder p="xs" radius="sm">
          <Group
            justify="space-between"
            style={{ cursor: "pointer" }}
            onClick={() => setExpanded(expanded === run.id ? null : run.id)}
          >
            <Group gap="xs">
              <Badge size="xs" color={statusColor(run.status)}>
                {run.status}
              </Badge>
              <Text size="xs" c="dimmed">
                {new Date(run.started_at).toLocaleString()}
              </Text>
              {run.finished_at && (
                <Text size="xs" c="dimmed">
                  {(
                    (new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) /
                    1000
                  ).toFixed(1)}
                  s
                </Text>
              )}
            </Group>
            <Text size="xs" c="dimmed">
              {expanded === run.id ? "▲" : "▼"}
            </Text>
          </Group>
          <Collapse expanded={expanded === run.id}>
            <ScrollArea h={160} mt="xs">
              <Code block style={{ fontSize: 11, whiteSpace: "pre-wrap" }}>
                {run.logs.join("\n") || t("scheduler.noLogs")}
              </Code>
            </ScrollArea>
          </Collapse>
        </Card>
      ))}
    </Stack>
  );
}

function JobCard({ job }: { job: CronJobResponse }) {
  const {
    t,
    i18n: { language },
  } = useTranslation();
  const qc = useQueryClient();
  const [showRuns, setShowRuns] = useState(false);
  const [editingCron, setEditingCron] = useState(false);
  const [cronDraft, setCronDraft] = useState(job.cron_expr);

  const updateMutation = useMutation({
    mutationFn: (body: { cron_expr?: string; enabled?: boolean }) =>
      updateSchedulerJob(job.id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduler-jobs"] }),
  });

  const triggerMutation = useMutation({
    mutationFn: () => triggerSchedulerJob(job.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-runs", job.id] });
      qc.invalidateQueries({ queryKey: ["scheduler-jobs"] });
      setShowRuns(true);
    },
  });

  return (
    <Card withBorder radius="md" p="md">
      <Group justify="space-between" mb="xs">
        <Group gap="sm">
          <Text fw={600}>{job.name}</Text>
          <Badge size="xs" variant="outline" color="gray">
            {job.cron_expr}
          </Badge>
          <Text size="xs" c="dimmed">
            {cronHint(job.cron_expr, language)}
          </Text>
        </Group>
        <Group gap="sm">
          <Switch
            size="sm"
            checked={job.enabled}
            onChange={(e) => updateMutation.mutate({ enabled: e.currentTarget.checked })}
          />
          <Tooltip label={t("scheduler.trigger")}>
            <ActionIcon
              variant="light"
              size="sm"
              loading={triggerMutation.isPending}
              onClick={() => triggerMutation.mutate()}
            >
              ▶
            </ActionIcon>
          </Tooltip>
          <Button
            size="xs"
            variant="subtle"
            onClick={() => {
              setCronDraft(job.cron_expr);
              setEditingCron(!editingCron);
            }}
          >
            {t("scheduler.editCron")}
          </Button>
        </Group>
      </Group>

      <Group gap="xl">
        {job.last_run_at && (
          <Text size="xs" c="dimmed">
            {t("scheduler.lastRun")}: {new Date(job.last_run_at).toLocaleString()}
          </Text>
        )}
        <Text size="xs" c="dimmed">
          {t("scheduler.nextRun")}:{" "}
          {job.next_run_at ? new Date(job.next_run_at).toLocaleString() : "—"}
        </Text>
      </Group>

      <Collapse expanded={editingCron}>
        <CronEditor value={cronDraft} onChange={setCronDraft} />
        <Group mt="sm" gap="xs">
          <Button
            size="xs"
            disabled={!isValidCron(cronDraft)}
            loading={updateMutation.isPending}
            onClick={() => {
              updateMutation.mutate({ cron_expr: cronDraft });
              setEditingCron(false);
            }}
          >
            {t("common.save")}
          </Button>
          <Button size="xs" variant="subtle" onClick={() => setEditingCron(false)}>
            {t("common.cancel")}
          </Button>
        </Group>
      </Collapse>

      <Button size="xs" variant="subtle" mt="sm" onClick={() => setShowRuns(!showRuns)}>
        {showRuns ? t("scheduler.hideRuns") : t("scheduler.showRuns")}
      </Button>

      <Collapse expanded={showRuns}>
        <Stack mt="sm">
          <JobRunHistory jobId={job.id} />
        </Stack>
      </Collapse>
    </Card>
  );
}

export function SchedulerPage() {
  const { t } = useTranslation();
  const { data: jobs, isLoading } = useQuery({
    queryKey: ["scheduler-jobs"],
    queryFn: listSchedulerJobs,
    refetchInterval: 10000,
  });

  return (
    <Stack gap="lg" maw={860}>
      <Title order={2}>{t("scheduler.title")}</Title>
      {isLoading && <Loader size="sm" />}
      {jobs?.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </Stack>
  );
}
