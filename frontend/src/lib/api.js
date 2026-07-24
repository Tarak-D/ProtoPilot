import axios from "axios";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND}/api`;

export const api = axios.create({ baseURL: API });

export const createProject = (idea, title) =>
  api.post("/projects", { idea, title }).then((r) => r.data);
export const listProjects = () => api.get("/projects").then((r) => r.data);
export const getProject = (id) => api.get(`/projects/${id}`).then((r) => r.data);
export const deleteProject = (id) => api.delete(`/projects/${id}`).then((r) => r.data);

export const failureMuseum = (id) =>
  api.post(`/projects/${id}/failure-museum`).then((r) => r.data);
export const realityCheck = (id, payload) =>
  api.post(`/projects/${id}/reality-check`, payload).then((r) => r.data);
export const timeMachine = (id) =>
  api.post(`/projects/${id}/time-machine`).then((r) => r.data);
export const judgeQuestions = (id) =>
  api.post(`/projects/${id}/judge/questions`).then((r) => r.data);
export const judgeScore = (id, payload) =>
  api.post(`/projects/${id}/judge/score`, payload).then((r) => r.data);
export const shipIt = (id) => api.post(`/projects/${id}/ship`).then((r) => r.data);
export const saveGithub = (token, username) =>
  api.post("/settings/github", { token, username }).then((r) => r.data);
export const githubStatus = () => api.get("/settings/github/status").then((r) => r.data);

// SSE orchestrator
export function orchestrate(id, onEvent) {
  return new Promise((resolve, reject) => {
    fetch(`${API}/projects/${id}/orchestrate`, { method: "POST" })
      .then(async (res) => {
        if (!res.ok) return reject(new Error(`orchestrate failed ${res.status}`));
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const parts = buf.split("\n\n");
          buf = parts.pop() || "";
          for (const p of parts) {
            const line = p.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            try {
              onEvent(JSON.parse(line.slice(6)));
            } catch (parseErr) {
              console.warn("SSE parse error:", parseErr, "line:", line);
            }
          }
        }
        resolve();
      })
      .catch(reject);
  });
}
