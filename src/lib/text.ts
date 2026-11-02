/** Minúsculas y sin acentos, para buscar. */
export function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
