"use client";

import { buttonStyles } from "../ui";

export function PrintButton() {
  return <button type="button" onClick={() => window.print()} className={buttonStyles.primary}>Print</button>;
}
