/**
 * Jewellery search synonyms: English / Bangla / Banglish.
 * Each inner array is one group of interchangeable terms — searching any one
 * matches products/collections containing any OTHER term in the same group.
 * Add more rows as your catalogue's vocabulary grows — nothing else needs to change.
 */
/**
 * Jewellery search synonyms: English / Bangla / Banglish.
 * Each inner array is one group of interchangeable terms — searching any one
 * matches products/collections containing any OTHER term in the same group.
 * Add more rows as your catalogue's vocabulary grows — nothing else needs to change.
 */
export const SYNONYM_GROUPS = [
  // ---- Earrings ----
  ['jhumka', 'jhumko', 'jhumki', 'jhumkas', 'ঝুমকা', 'ঝুমকো', 'ঝুমকি'],
  ['earring', 'ear ring', 'earrings', 'ear rings', 'kaner dul', 'kaner dol', 'kaner jhumka', 'কানের দুল', 'দুল', 'কানের জিনিস'],
  ['stud', 'studs', 'ear stud', 'ear studs', 'tops', 'top', 'kan tops', 'কানের টপস', 'টপস'],
  ['chandbali', 'chand bali', 'চাঁদবালি'],
  ['jhalar', 'jhumka jhalar', 'ঝালর'],
  ['danglers', 'dangler', 'hanging earring', 'jhulanto dul', 'ঝুলন্ত দুল'],

  // ---- Necklace / Mala family (very high priority for this shop) ----
  ['necklace', 'necklaces', 'har', 'haar', 'gorer har', 'গলার হার', 'হার', 'গলার সেট'],
  ['mala', 'malas', 'garland', 'মালা'],
  ['boro mala', 'boro der mala', 'boro mala set', 'বড় মালা', 'বড়দের মালা'],
  ['choto mala', 'choto der mala', 'choto mala set', 'ছোট মালা', 'ছোটদের মালা'],
  ['mala bicha', 'mala bichi', 'mala bicha set', 'মালা বিছা', 'বিছা মালা'],
  ['saree mala', 'sharee mala', 'saree har', 'শাড়ি মালা', 'শাড়ির মালা'],
  ['long mala', 'long necklace', 'lomba mala', 'লম্বা মালা'],
  ['rani haar', 'rani har', 'রানী হার'],
  ['choker', 'chokar', 'chokers', 'চোকার', 'গলাবন্ধ'],
  ['pearl mala', 'moti mala', 'মুক্তার মালা', 'মতি মালা'],
  ['kolkata mala', 'kolkata style mala', 'কলকাতা মালা'],
  ['bridal mala', 'bou mala', 'biye mala', 'বিয়ের মালা', 'বউ মালা'],

  // ---- Bangles / Churi ----
  ['bangle', 'bangles', 'churi', 'chudi', 'churri', 'churi set', 'চুড়ি', 'চুরি'],
  ['bala', 'balas', 'kada', 'kara', 'বালা', 'কড়া', 'কাড়া'],
  ['kangan', 'kada bala', 'কাঙ্গন'],
  ['bracelet', 'bracelets', 'hater bala', 'বেসলেট', 'ব্রেসলেট', 'হাতের বালা'],

  // ---- Rings ----
  ['ring', 'rings', 'rins', 'ringx', 'angti', 'aangti', 'anguthi', 'আংটি', 'আংটি সেট'],
  ['couple ring', 'jodi angti', 'কাপল রিং', 'জোড়া আংটি'],
  ['adjustable ring', 'size change angti', 'অ্যাডজাস্টেবল আংটি'],

  // ---- Chains ----
  ['chain', 'chains', 'chen', 'chein', 'chain set', 'চেইন', 'চেন'],
  ['china chain', 'china chain set', 'চায়না চেইন'],
  ['gold chain', 'sona chain', 'সোনার চেইন', 'গোল্ড চেইন'],
  ['thick chain', 'mota chain', 'মোটা চেইন'],
  ['thin chain', 'chikon chain', 'চিকন চেইন'],

  // ---- Locket / Pendant ----
  ['locket', 'lockets', 'pendant', 'pendants', 'loket', 'লকেট', 'পেনডেন্ট'],
  ['chain with locket', 'locket set', 'chain locket', 'চেইন লকেট সেট'],
  ['name locket', 'নাম লকেট'],

  // ---- Head / Maang jewellery ----
  ['tikli', 'tikka', 'maang tikka', 'tika', 'টিকলি', 'টিকা', 'টিক্কা'],
  ['matha patti', 'mathapatti', 'head chain', 'মাথা পট্টি'],

  // ---- Anklets ----
  ['payal', 'payel', 'anklet', 'anklets', 'nupur', 'nupura', 'পায়েল', 'নূপুর', 'পায়েলা'],

  // ---- Sets / combos ----
  ['set', 'sets', 'jewellery set', 'jewelry set', 'gohona set', 'গয়নার সেট', 'সেট', 'গহনা সেট'],
  ['full set', 'complete set', 'matching set', 'ফুল সেট'],
  ['gohona', 'gohna', 'jewellery', 'jewelry', 'ornaments', 'গহনা', 'গয়না', 'অলংকার'],

  // ---- Materials / finishes ----
  ['gold', 'gold plated', 'sona', 'sonar', 'golden', 'সোনা', 'সোনার', 'গোল্ড', 'গোল্ডেন'],
  ['silver', 'silver plated', 'rupa', 'rupar', 'রুপা', 'রূপা', 'সিলভার'],
  ['antique', 'antique finish', 'purono', 'purono design', 'পুরাতন', 'পুরনো', 'আন্টিক', 'এন্টিক'],
  ['oxidised', 'oxidized', 'oxidise', 'oxi', 'oxy', 'অক্সিডাইজড', 'অক্সি'],
  ['xuping', 'xuping jewellery', 'xuping gold', 'জুপিং', 'ক্সুপিং'],
  ['matte', 'matte finish', 'ম্যাট'],
  ['rose gold', 'rose gold plated', 'রোজ গোল্ড'],
  ['kundan', 'কুন্দন'],
  ['meenakari', 'meena', 'মীনাকারি', 'মিনা'],
  ['stone', 'stone work', 'pathor', 'পাথর', 'পাথরের কাজ'],
  ['pearl', 'moti', 'মুক্তা', 'মতি'],
  ['artificial', 'imitation', 'fashion jewellery', 'নকল', 'আর্টিফিশিয়াল', 'ফ্যাশন জুয়েলারি'],
  ['diamond', 'diamond cut', 'hira', 'হীরা', 'ডায়মন্ড'],

  // ---- Nose jewellery ----
  ['nose pin', 'nosepin', 'nath', 'nathiya', 'নথ', 'নাকফুল', 'নথিয়া'],

  // ---- Waist / body ----
  ['waist chain', 'kombor bala', 'বিছা', 'কোমর বিছা', 'ওয়েস্ট চেইন'],

  // ---- Brooch / accessories often sold alongside ----
  ['brooch', 'batch', 'badge', 'pin', 'ব্রোচ', 'ব্যাজ', 'পিন'],
  ['hair clip', 'hair pin', 'চুলের ক্লিপ', 'হেয়ার পিন'],
  ['bindi', 'টিপ', 'বিন্দি'],

  // ---- Occasion / style tags (helps generic browsing queries) ----
  ['bridal', 'biye', 'bou', 'wedding', 'বিয়ে', 'বউ', 'বিয়ের গহনা'],
  ['party wear', 'party', 'পার্টি', 'পার্টি ওয়্যার'],
  ['daily wear', 'regular', 'নিয়মিত ব্যবহারের'],
  ['kids jewellery', 'baby jewellery', 'bachchader gohona', 'বাচ্চাদের গহনা'],
];
/**
 * Given a raw query, return every term to search: the original plus every
 * term from any group it matches (substring either direction, so "jhumka"
 * finds "jhumko" and "kaner" finds "kaner dul").
 */
export function expandSearchTerms(rawQuery) {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return [];
  const found = new Set([q]);
  for (const group of SYNONYM_GROUPS) {
    const hit = group.some((term) => {
      const t = term.toLowerCase();
      return q.includes(t) || t.includes(q);
    });
    if (hit) group.forEach((term) => found.add(term.toLowerCase()));
  }
  return [...found].slice(0, 12); // cap so a short/common query can't explode the query
}