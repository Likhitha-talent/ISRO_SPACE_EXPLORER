const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

const get = (path, params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`${path}${qs ? "?" + qs : ""}`);
};
const post = (path, body) => request(path, { method: "POST", body: JSON.stringify(body) });
const put  = (path, body) => request(path, { method: "PUT",  body: JSON.stringify(body) });
const del  = (path)       => request(path, { method: "DELETE" });

export const satellitesApi = {
  getAll: (params) => get("/satellites", params),
  getOne: (id)     => get(`/satellites/${id}`),
  create: (body)   => post("/satellites", body),
  update: (id, b)  => put(`/satellites/${id}`, b),
  remove: (id)     => del(`/satellites/${id}`),
};

export const missionsApi = {
  getAll: (params) => get("/missions", params),
  getOne: (id)     => get(`/missions/${id}`),
  create: (body)   => post("/missions", body),
  update: (id, b)  => put(`/missions/${id}`, b),
  remove: (id)     => del(`/missions/${id}`),
};

export const vehiclesApi = {
  getAll: (params) => get("/vehicles", params),
  getOne: (id)     => get(`/vehicles/${id}`),
  create: (body)   => post("/vehicles", body),
  update: (id, b)  => put(`/vehicles/${id}`, b),
  remove: (id)     => del(`/vehicles/${id}`),
};

export const sitesApi = {
  getAll: (params) => get("/sites", params),
  getOne: (id)     => get(`/sites/${id}`),
  create: (body)   => post("/sites", body),
  update: (id, b)  => put(`/sites/${id}`, b),
  remove: (id)     => del(`/sites/${id}`),
};

export const scientistsApi = {
  getAll: (params) => get("/scientists", params),
  getOne: (id)     => get(`/scientists/${id}`),
  create: (body)   => post("/scientists", body),
  update: (id, b)  => put(`/scientists/${id}`, b),
  remove: (id)     => del(`/scientists/${id}`),
};

export const checkHealth = () => get("/health");