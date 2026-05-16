import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login, register } from "../lib/api";
import type { TokenResponse } from "../dto/auth";
import styles from "./LoginPage.module.css";

type Mode = "login" | "register";

const authenticate = (mode: Mode, email: string, password: string): Promise<TokenResponse> =>
  mode === "login" ? login(email, password) : register(email, password);

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: () => authenticate(mode, email, password),
    onSuccess: (data) => {
      localStorage.setItem("token", data.access_token);
      queryClient.clear();
      navigate("/");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <h1 className={styles.title}>{mode === "login" ? "Sign in" : "Create account"}</h1>
        <p className={styles.subtitle}>
          {mode === "login" ? "Welcome back." : "Get started for free."}
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className={styles.input}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className={styles.input}
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>



          <button className={styles.button} type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Please wait…" : mode === "login" ? "Sign in" : "Register"}
          </button>
        </form>

        <div className={styles.toggle}>
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              mutation.reset();
            }}
          >
            {mode === "login" ? "Register" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
