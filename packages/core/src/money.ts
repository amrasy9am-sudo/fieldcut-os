/** All money in Fieldcut OS is an integer number of sen (RM1.00 = 100 sen). */
export type Sen = number;

export function formatRM(sen: Sen): string {
  const sign = sen < 0 ? "-" : "";
  return `${sign}RM${(Math.abs(sen) / 100).toFixed(2)}`;
}
