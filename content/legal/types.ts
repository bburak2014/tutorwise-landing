/** Paragraf ya da madde listesi. */
export type Block = string | readonly string[];

export type LegalDoc = {
  title: string;
  /** Arama sonuçlarında görünen kısa açıklama. */
  description: string;
  intro: string;
  sections: readonly { title: string; body: readonly Block[] }[];
};

/** Gizlilik politikası ve kullanım koşulları; diller Türkçe kaynağı bölüm
 *  bölüm izler (tests/legal.test.ts). */
export type Legal = {
  updated: string;
  contents: string;
  home: string;
  privacy: LegalDoc;
  terms: LegalDoc;
};
