import { notifications } from "@mantine/notifications";
import { HTTPError } from "ky";

const STATUS_MESSAGES: Record<number, string> = {
  400: "Bad request",
  401: "Invalid credentials",
  403: "Forbidden — you don't have permission to do this",
  404: "Not found",
  409: "Conflict — resource already exists",
  422: "Invalid data",
  500: "Server error — try again later",
};

export async function showErrorToast(error: unknown): Promise<void> {
  if (error instanceof HTTPError) {
    const status = error.response.status;

    let detail: string | undefined;
    try {
      const body = await error.response.clone().json();
      detail = body?.detail;
    } catch {
      // non-JSON body
    }

    notifications.show({
      color: "red",
      title: STATUS_MESSAGES[status] ?? `Error ${status}`,
      message: typeof detail === "string" ? detail : undefined,
      autoClose: 5000,
    });
  } else if (error instanceof Error) {
    notifications.show({
      color: "red",
      title: "Unexpected error",
      message: error.message,
      autoClose: 5000,
    });
  }
}
