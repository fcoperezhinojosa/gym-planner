"use client";

import { createContext } from "react";

/** Permite que el formulario de actividad cierre el panel que lo contiene al registrar con éxito. */
export const CloseAddActivityContext = createContext<(() => void) | null>(null);
