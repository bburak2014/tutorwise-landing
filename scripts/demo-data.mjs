// Ekran görüntüleri için dile göre örnek veri: kişiler, konular, ödevler,
// veli notu ve haftalık özet. Kişiler uydurmadır; gerçek kimseyi temsil etmez.

const ROWS = {
  tr: {
    guardian: "Selin Arslan",
    teacher: "Elif Kaya",
    student: { name: "Deniz Arslan", grade: "11", subject: "Matematik" },
    others: [
      { name: "Ada Yılmaz", grade: "9", subject: "Fizik" },
      { name: "Kerem Aydın", grade: "12", subject: "Matematik" },
      { name: "Zeynep Çelik", grade: "10", subject: "Kimya" },
    ],
    pack: "8 ders",
    location: "Çevrim içi",
    topics: ["Türev ve uygulamaları", "Olasılık", "Newton'un hareket yasaları", "Mol kavramı", "Fonksiyonlar", "Trigonometri"],
    assignments: [
      ["Türev alıştırmaları", "Kitaptaki 1–10. soruları çözün; çözüm adımlarını yazın.", "Hepsini çözdüm, 7. soruda zincir kuralında takıldım.", "Çok iyi ilerleme. 7. soruyu bir sonraki derste birlikte çözelim."],
      ["Olasılık problemleri", "Çalışma kâğıdındaki 8 soruyu çözün.", "Tamamladım, fotoğrafını ekledim."],
      ["Limit tekrar testi", "Süre tutarak 20 soruluk testi çözün."],
    ],
    note: "Deniz bu hafta türevde belirgin ilerleme gösterdi; sırada zincir kuralını pekiştirmek var.",
    summary: "Bu hafta iki ders yaptık: türev uygulamaları ve olasılık. Üç ödevden ikisi teslim edildi. Gelecek hafta limit tekrarına odaklanacağız.",
    payments: ["Ekim paketi", "Eylül paketi", "Ekim paketi", "Ekim paketi"],
  },
  en: {
    guardian: "Rachel Bennett",
    teacher: "Emma Clarke",
    student: { name: "Oliver Bennett", grade: "Year 11", subject: "Maths" },
    others: [
      { name: "Sophie Reed", grade: "Year 9", subject: "Physics" },
      { name: "Jack Wilson", grade: "Year 12", subject: "Maths" },
      { name: "Amelia Hughes", grade: "Year 10", subject: "Chemistry" },
    ],
    pack: "8 lessons",
    location: "Online",
    topics: ["Derivatives", "Probability", "Newton's laws", "The mole", "Functions", "Trigonometry"],
    assignments: [
      ["Derivatives practice", "Solve questions 1–10 in the book and show your working.", "All done. I got stuck on question 7 with the chain rule.", "Great progress. We'll go through question 7 together next lesson."],
      ["Probability problems", "Work through the 8 problems on the worksheet.", "Finished, photo attached."],
      ["Limits review quiz", "Do the 20-question quiz with a timer."],
    ],
    note: "Oliver made clear progress with derivatives this week; next we'll reinforce the chain rule.",
    summary: "Two lessons this week: applications of derivatives and probability. Two of three assignments were handed in. Next week we'll focus on reviewing limits.",
    payments: ["October package", "September package", "October package", "October package"],
  },
  de: {
    guardian: "Katrin Hoffmann",
    teacher: "Anna Becker",
    student: { name: "Lukas Hoffmann", grade: "11. Klasse", subject: "Mathematik" },
    others: [
      { name: "Mia Schneider", grade: "9. Klasse", subject: "Physik" },
      { name: "Jonas Weber", grade: "12. Klasse", subject: "Mathematik" },
      { name: "Lea Fischer", grade: "10. Klasse", subject: "Chemie" },
    ],
    pack: "8 Stunden",
    location: "Online",
    topics: ["Ableitungen", "Wahrscheinlichkeit", "Newtonsche Gesetze", "Stoffmenge", "Funktionen", "Trigonometrie"],
    assignments: [
      ["Übungen zu Ableitungen", "Löse die Aufgaben 1–10 im Buch und schreibe den Lösungsweg auf.", "Alles gelöst, bei Aufgabe 7 hänge ich an der Kettenregel.", "Sehr guter Fortschritt. Aufgabe 7 lösen wir in der nächsten Stunde gemeinsam."],
      ["Wahrscheinlichkeitsaufgaben", "Bearbeite die 8 Aufgaben auf dem Arbeitsblatt.", "Fertig, ein Foto ist angehängt."],
      ["Wiederholungstest Grenzwerte", "Löse den Test mit 20 Fragen auf Zeit."],
    ],
    note: "Lukas hat diese Woche bei Ableitungen deutliche Fortschritte gemacht; als Nächstes festigen wir die Kettenregel.",
    summary: "Diese Woche zwei Stunden: Anwendungen der Ableitung und Wahrscheinlichkeit. Zwei von drei Aufgaben wurden abgegeben. Nächste Woche wiederholen wir Grenzwerte.",
    payments: ["Paket Oktober", "Paket September", "Paket Oktober", "Paket Oktober"],
  },
  fr: {
    guardian: "Isabelle Bernard",
    teacher: "Claire Martin",
    student: { name: "Hugo Bernard", grade: "Première", subject: "Mathématiques" },
    others: [
      { name: "Léa Dubois", grade: "Troisième", subject: "Physique" },
      { name: "Louis Moreau", grade: "Terminale", subject: "Mathématiques" },
      { name: "Chloé Laurent", grade: "Seconde", subject: "Chimie" },
    ],
    pack: "8 séances",
    location: "En ligne",
    topics: ["Dérivées", "Probabilités", "Lois de Newton", "La mole", "Fonctions", "Trigonométrie"],
    assignments: [
      ["Exercices sur les dérivées", "Résous les exercices 1 à 10 du manuel en détaillant les étapes.", "Tout est fait, je bloque sur le 7 avec la dérivée composée.", "Très bon travail. On reprendra le 7 ensemble au prochain cours."],
      ["Problèmes de probabilités", "Fais les 8 problèmes de la fiche.", "Terminé, j'ai ajouté une photo."],
      ["Test de révision sur les limites", "Fais le test de 20 questions en temps limité."],
    ],
    note: "Hugo a nettement progressé sur les dérivées cette semaine ; nous allons consolider la dérivée composée.",
    summary: "Deux cours cette semaine : applications des dérivées et probabilités. Deux devoirs sur trois ont été rendus. La semaine prochaine, révision des limites.",
    payments: ["Forfait octobre", "Forfait septembre", "Forfait octobre", "Forfait octobre"],
  },
  es: {
    guardian: "Elena Martínez",
    teacher: "Lucía García",
    student: { name: "Pablo Martínez", grade: "1.º Bachillerato", subject: "Matemáticas" },
    others: [
      { name: "Sofía López", grade: "3.º ESO", subject: "Física" },
      { name: "Mateo Sánchez", grade: "2.º Bachillerato", subject: "Matemáticas" },
      { name: "Carmen Ruiz", grade: "4.º ESO", subject: "Química" },
    ],
    pack: "8 clases",
    location: "En línea",
    topics: ["Derivadas", "Probabilidad", "Leyes de Newton", "El mol", "Funciones", "Trigonometría"],
    assignments: [
      ["Ejercicios de derivadas", "Resuelve los ejercicios 1–10 del libro y escribe los pasos.", "Los he hecho todos; en el 7 me lié con la regla de la cadena.", "Muy buen avance. El 7 lo vemos juntos en la próxima clase."],
      ["Problemas de probabilidad", "Resuelve los 8 problemas de la ficha.", "Terminado, he adjuntado una foto."],
      ["Repaso de límites", "Haz el test de 20 preguntas con cronómetro."],
    ],
    note: "Pablo ha avanzado claramente con las derivadas esta semana; ahora reforzaremos la regla de la cadena.",
    summary: "Dos clases esta semana: aplicaciones de las derivadas y probabilidad. Se entregaron dos de las tres tareas. La próxima semana repasaremos límites.",
    payments: ["Paquete de octubre", "Paquete de septiembre", "Paquete de octubre", "Paquete de octubre"],
  },
  zh: {
    guardian: "陈敏",
    teacher: "李静",
    student: { name: "陈子涵", grade: "高二", subject: "数学" },
    others: [
      { name: "王欣怡", grade: "初三", subject: "物理" },
      { name: "刘浩然", grade: "高三", subject: "数学" },
      { name: "赵雨桐", grade: "高一", subject: "化学" },
    ],
    pack: "8 节课",
    location: "线上",
    topics: ["导数及其应用", "概率", "牛顿运动定律", "物质的量", "函数", "三角函数"],
    assignments: [
      ["导数练习", "完成课本第 1–10 题，写出解题步骤。", "都做完了，第 7 题的链式法则卡住了。", "进步很大。第 7 题下节课我们一起讲。"],
      ["概率题", "完成练习纸上的 8 道题。", "已完成，照片已上传。"],
      ["极限复习测验", "限时完成 20 道题的测验。"],
    ],
    note: "子涵本周在导数方面进步明显，接下来我们会巩固链式法则。",
    summary: "本周上了两节课：导数的应用和概率。三项作业中已提交两项。下周我们将重点复习极限。",
    payments: ["10 月课时包", "9 月课时包", "10 月课时包", "10 月课时包"],
  },
  ja: {
    guardian: "高橋 恵",
    teacher: "佐藤 美咲",
    student: { name: "高橋 悠斗", grade: "高校2年", subject: "数学" },
    others: [
      { name: "田中 結衣", grade: "中学3年", subject: "物理" },
      { name: "伊藤 蓮", grade: "高校3年", subject: "数学" },
      { name: "渡辺 さくら", grade: "高校1年", subject: "化学" },
    ],
    pack: "8回",
    location: "オンライン",
    topics: ["微分とその応用", "確率", "ニュートンの運動法則", "物質量", "関数", "三角関数"],
    assignments: [
      ["微分の演習", "教科書の1〜10番を解き、途中式も書いてください。", "全部解きました。7番の合成関数の微分でつまずきました。", "よく進んでいます。7番は次の授業で一緒に解きましょう。"],
      ["確率の問題", "プリントの8問を解いてください。", "終わりました。写真を添付しました。"],
      ["極限の復習テスト", "時間を計って20問のテストを解いてください。"],
    ],
    note: "悠斗さんは今週、微分で大きく前進しました。次は合成関数の微分を固めます。",
    summary: "今週は2回の授業を行いました（微分の応用と確率）。課題は3つのうち2つを提出済みです。来週は極限の復習に取り組みます。",
    payments: ["10月パッケージ", "9月パッケージ", "10月パッケージ", "10月パッケージ"],
  },
};

/** Uygulamanın her dildeki "Ortak tahta" düğmesi (liveLesson.board). */
export const BOARD_LABEL = {
  tr: "Ortak tahta",
  en: "Shared whiteboard",
  de: "Gemeinsame Tafel",
  fr: "Tableau partagé",
  es: "Pizarra compartida",
  zh: "共享白板",
  ja: "共有ホワイトボード",
};

/** Takvimdeki "Hafta" düğmesi (calendar.week). */
export const WEEK_LABEL = {
  tr: "Hafta",
  en: "Week",
  de: "Woche",
  fr: "Semaine",
  es: "Semana",
  zh: "周",
  ja: "週",
};

export function demoData(locale) {
  const row = ROWS[locale];
  if (!row) throw new Error(`Bilinmeyen dil: ${locale}`);
  return row;
}

export const demoLocales = Object.keys(ROWS);
