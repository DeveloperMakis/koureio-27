/** Χρώματα/αποστάσεις από το branding του website (μαύρο + χρυσό). */
export const colors = {
  bg: "#0a0a0b",
  panel: "#111113",
  panel2: "#1a1a1e",
  bone: "#f4efe6",
  muted: "#cfc7b8",
  dim: "#9a9284",
  gold: "#c9a349",
  goldSoft: "rgba(201,163,73,0.14)",
  border: "rgba(201,163,73,0.18)",
  danger: "#e5675f",
  success: "#53c08a",
  ink950: "#0a0a0b",
};

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 };

export const sp = (n: number) => n * 4;

export const font = {
  regular: "System",
  // Το «display» serif του website δεν φορτώνεται native· χρησιμοποιούμε system
  // με έντονο βάρος για τους τίτλους (σωστή υποστήριξη ελληνικών τόνων).
};
