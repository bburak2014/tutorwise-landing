/** Metni yazar; "[YER TUTUCU: …]" gibi köşeli parantezli yer tutucuları
 *  sayfada açıkça işaretler, gerçek bilgi gelene kadar gözden kaçmasın. */
export function Rich({ text }: Readonly<{ text: string }>) {
  if (text.startsWith("[") && text.endsWith("]"))
    return <span className="placeholder">{text}</span>;
  return text;
}
