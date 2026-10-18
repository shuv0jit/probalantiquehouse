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
  // ================= EARRINGS =================
  ['jhumka', 'jhumko', 'jhumki', 'jhumkas', 'jhumkha', 'jhumkaa', 'jhumkar', 'jumka', 'jumko', 'jhomka', 'ঝুমকা', 'ঝুমকো', 'ঝুমকি', 'ঝুমকার'],
  ['earring', 'earrings', 'ear ring', 'ear rings', 'eraring', 'earing', 'earings', 'kaner dul', 'kaner dol', 'kaner dull', 'kan er dul', 'kaner jhumka', 'kaner gohona', 'কানের দুল', 'দুল', 'কানের গহনা', 'কানের জিনিস'],
  ['stud', 'studs', 'ear stud', 'ear studs', 'tops', 'top', 'kan tops', 'kaner tops', 'kaner top', 'টপস', 'কানের টপস', 'কানের টপ'],
  ['bali', 'baali', 'hoop', 'hoops', 'hoop earring', 'ring dul', 'kaner bali', 'বালি', 'কানের বালি', 'হুপ'],
  ['chandbali', 'chand bali', 'chandbaali', 'chaandbali', 'chadbali', 'চাঁদবালি', 'চাঁদ বালি', 'চান্দবালি'],
  ['jhalar', 'jhalor', 'jhalar dul', 'jhumka jhalar', 'ঝালর', 'ঝালর দুল'],
  ['dangler', 'danglers', 'drop earring', 'hanging earring', 'jhulanto dul', 'jhulon dul', 'ঝুলন্ত দুল', 'ঝুলন দুল'],
  ['ear cuff', 'earcuff', 'cuff earring', 'kan cuff', 'কান কাফ', 'ইয়ার কাফ'],
  ['kaan phool', 'kaanphul', 'kan phul', 'kaner phul', 'phul dul', 'flower earring', 'কানফুল', 'কানের ফুল', 'ফুল দুল'],
  ['ear chain', 'kan chain', 'kaan chain', 'sahara', 'kaner chain', 'কান চেইন', 'কানের চেইন'],
  ['pasa', 'passa', 'jhumar', 'jhoomar', 'ঝুমর', 'পাশা'],
  ['sui dhaga', 'suidhaga', 'sui dhaga earring', 'সুই ধাগা'],

  // ================= NECKLACE / MALA / HAR =================
  ['necklace', 'necklaces', 'neckless', 'necless', 'necklase', 'neck set', 'gola', 'golar', 'golar har', 'gorer har', 'গলার হার', 'গলার সেট', 'নেকলেস'],
  ['har', 'haar', 'hare', 'হার', 'হারের সেট'],
  ['mala', 'malas', 'maala', 'mela', 'garland', 'মালা', 'মালার সেট'],
  ['boro mala', 'boro der mala', 'boro mala set', 'bro mala', 'বড় মালা', 'বড়দের মালা'],
  ['choto mala', 'choto der mala', 'choto mala set', 'ছোট মালা', 'ছোটদের মালা'],
  ['mala bicha', 'mala bichi', 'mala bicha set', 'মালা বিছা', 'বিছা মালা'],
  ['saree mala', 'sharee mala', 'sari mala', 'saree har', 'শাড়ি মালা', 'শাড়ির মালা'],
  ['long mala', 'long necklace', 'long har', 'lomba mala', 'lamba mala', 'লম্বা মালা', 'লম্বা হার'],
  ['short necklace', 'short mala', 'choto necklace', 'ছোট নেকলেস'],
  ['rani haar', 'rani har', 'ranihar', 'রানী হার', 'রানিহার'],
  ['sitahar', 'sita har', 'sitahaar', 'sita haar', 'সীতাহার', 'সীতা হার'],
  ['choker', 'chokar', 'chokers', 'choker set', 'gola bondho', 'golabondho', 'চোকার', 'গলাবন্ধ', 'চকার'],
  ['pearl mala', 'moti mala', 'motir mala', 'মুক্তার মালা', 'মতি মালা', 'মোতি মালা'],
  ['kolkata mala', 'kolkata style mala', 'kolkata necklace', 'কলকাতা মালা'],
  ['bridal mala', 'bou mala', 'biye mala', 'bridal necklace', 'বিয়ের মালা', 'বউ মালা', 'বউয়ের মালা'],
  ['mangalsutra', 'mongolsutro', 'mangal sutra', 'মঙ্গলসূত্র'],
  ['tabij', 'taabiz', 'tabiz', 'tabeez', 'ধাবিজ', 'তাবিজ'],
  ['kanthi', 'kanthi mala', 'কণ্ঠি', 'কন্ঠী'],
  ['beads mala', 'bead necklace', 'dana mala', 'dana', 'দানা মালা', 'দানার মালা'],
  ['layered necklace', 'multi layer', 'multilayer', 'layer mala', 'লেয়ার নেকলেস'],
  ['temple jewellery', 'temple set', 'temple necklace', 'টেম্পল সেট'],

  // ================= BANGLES / CHURI / POLA =================
  ['bangle', 'bangles', 'bangel', 'bengle', 'churi', 'chudi', 'churri', 'chudi', 'churee', 'churi set', 'hater churi', 'চুড়ি', 'চুরি', 'চুড়ির সেট'],
  ['pola', 'polaa', 'pula', 'pola churi', 'pola bangle', 'লাল পলা', 'পলা', 'পলা চুড়ি'],
  ['shakha', 'sakha', 'shankha', 'shankha churi', 'shakha pola', 'sakha pola', 'shakha-pola', 'শাঁখা', 'শাখা', 'শাঁখা পলা', 'শাখা পলা'],
  ['bala', 'balas', 'baala', 'kada', 'kara', 'kora', 'বালা', 'কড়া', 'কাড়া', 'কাড়া বালা'],
  ['kangan', 'kankan', 'kangon', 'kada bala', 'কাঙ্গন', 'কঙ্কন'],
  ['noa', 'loha', 'iron bangle', 'নোয়া', 'লোহা'],
  ['bracelet', 'bracelets', 'braslet', 'braclet', 'hater bala', 'hater chain', 'bela', 'বেসলেট', 'ব্রেসলেট', 'হাতের বালা', 'হাতের চেইন'],
  ['bangle set', 'churi set', 'chuti set', 'dozen churi', 'চুড়ি সেট', 'ডজন চুড়ি'],
  ['openable bangle', 'screw bangle', 'adjustable bangle', 'free size churi', 'ফ্রি সাইজ চুড়ি', 'অ্যাডজাস্টেবল চুড়ি'],
  ['kids bangle', 'baby bala', 'baby churi', 'bachchar churi', 'bachchar bala', 'বাচ্চাদের চুড়ি', 'বাচ্চাদের বালা'],
  ['armlet', 'bajuband', 'baju band', 'bajubond', 'tagaa', 'tayeet', 'বাজুবন্ধ', 'তাগা', 'বাজু'],

  // ================= RINGS / ANGTI =================
  ['ring', 'rings', 'rin', 'rins', 'ringx', 'angti', 'aangti', 'anguthi', 'angthi', 'angoti', 'angty', 'aunti', 'আংটি', 'আঙটি', 'আংটির সেট'],
  ['couple ring', 'jodi angti', 'jori angti', 'couple angti', 'কাপল রিং', 'জোড়া আংটি', 'জোড়ি আংটি'],
  ['adjustable ring', 'size change angti', 'free size angti', 'free size ring', 'অ্যাডজাস্টেবল আংটি', 'ফ্রি সাইজ আংটি'],
  ['engagement ring', 'proposal ring', 'solitaire ring', 'biyer angti', 'এনগেজমেন্ট রিং', 'বিয়ের আংটি'],
  ['stone ring', 'pathor angti', 'stone angti', 'পাথরের আংটি'],
  ['toe ring', 'bichhiya', 'bichiya', 'bichha', 'metti', 'পায়ের আংটি', 'বিছিয়া'],
  ['mens ring', 'gents ring', 'gents angti', 'ছেলেদের আংটি'],
  ['ladies ring', 'womens ring', 'ladies angti', 'মেয়েদের আংটি'],
  ['finger ring set', 'multi ring', 'ring set', 'আংটি সেট'],

  // ================= CHAINS =================
  ['chain', 'chains', 'chen', 'chein', 'chian', 'chane', 'chain set', 'চেইন', 'চেন', 'চেইন সেট'],
  ['china chain', 'china chain set', 'chaina chain', 'চায়না চেইন'],
  ['gold chain', 'sona chain', 'sonar chain', 'সোনার চেইন', 'গোল্ড চেইন'],
  ['thick chain', 'mota chain', 'motha chain', 'heavy chain', 'মোটা চেইন'],
  ['thin chain', 'chikon chain', 'sikon chain', 'light chain', 'চিকন চেইন'],
  ['rope chain', 'rope', 'দড়ি চেইন'],
  ['mens chain', 'gents chain', 'ছেলেদের চেইন'],
  ['ladies chain', 'womens chain', 'মেয়েদের চেইন'],
  ['boro chain', 'choto chain', 'বড় চেইন', 'ছোট চেইন'],

  // ================= LOCKET / PENDANT =================
  ['locket', 'lockets', 'loket', 'lokit', 'pendant', 'pendants', 'pendent', 'penden', 'লকেট', 'পেনডেন্ট', 'পেন্ডেন্ট'],
  ['chain with locket', 'locket set', 'chain locket', 'locket chain', 'চেইন লকেট সেট', 'লকেট সেট'],
  ['name locket', 'letter locket', 'initial pendant', 'alphabet locket', 'নাম লকেট', 'অক্ষরের লকেট'],
  ['om locket', 'ganesh locket', 'allah locket', 'islamic locket', 'ওম লকেট', 'আল্লাহ লকেট'],
  ['heart locket', 'love locket', 'হার্ট লকেট'],

  // ================= HEAD JEWELLERY =================
  ['tikli', 'tikka', 'maang tikka', 'maangtikka', 'mang tika', 'tika', 'tikly', 'টিকলি', 'টিকা', 'টিক্কা', 'মাং টিকা'],
  ['matha patti', 'mathapatti', 'matha pati', 'head chain', 'মাথা পট্টি', 'মাথাপট্টি'],
  ['sinthi', 'sithi', 'sinthi patti', 'sithipati', 'সিঁথি', 'সিঁথি পাটি', 'সিঁথিপাটি'],
  ['tiara', 'crown', 'mukut', 'mukuta', 'মুকুট', 'টিয়ারা'],
  ['hair clip', 'hair pin', 'hairpin', 'clip', 'চুলের ক্লিপ', 'হেয়ার পিন', 'ক্লিপ'],
  ['hair accessories', 'hair band', 'hairband', 'juda pin', 'juda', 'খোঁপা', 'হেয়ার ব্যান্ড'],
  ['bun pin', 'khopa', 'khopar pin', 'খোপার পিন'],

  // ================= ANKLETS / FEET =================
  ['payal', 'payel', 'paayel', 'pyal', 'anklet', 'anklets', 'nupur', 'nupura', 'nupor', 'pa chain', 'payer chain', 'পায়েল', 'নূপুর', 'পায়েলা', 'পায়ের চেইন', 'নুপুর'],
  ['gungur', 'ghungroo', 'ghungur', 'ghungru', 'ঘুঙুর', 'ঘুঙ্গুর'],
  ['mal', 'pa mal', 'paer mal', 'পায়ের মল', 'মল'],

  // ================= WAIST / NOSE / BODY =================
  ['waist chain', 'waist belt', 'kamarbandh', 'kamarbondh', 'komorbondh', 'kamar bandh', 'kombor bala', 'kamarband', 'কোমরবন্ধ', 'কোমর বিছা', 'ওয়েস্ট চেইন', 'কোমরের চেইন'],
  ['bicha', 'bichha', 'bichi', 'বিছা'],
  ['nose pin', 'nosepin', 'nose ring', 'nath', 'nathiya', 'nathi', 'nakful', 'nak phul', 'nak er phul', 'nakchabi', 'নথ', 'নাকফুল', 'নথিয়া', 'নাকের ফুল', 'নাকছাবি'],
  ['septum', 'septum ring', 'nose clip', 'নোজ ক্লিপ'],
  ['belly ring', 'navel ring', 'nabhi ring', 'নাভি রিং'],

  // ================= SETS / COMBOS =================
  ['set', 'sets', 'jewellery set', 'jewelry set', 'gohona set', 'gohnar set', 'গয়নার সেট', 'গহনা সেট', 'সেট'],
  ['full set', 'complete set', 'matching set', 'combo set', 'combo', 'ফুল সেট', 'কম্বো', 'কম্বো সেট'],
  ['necklace set', 'necklace earring set', 'har set', 'mala set', 'neckless set', 'নেকলেস সেট', 'হার সেট'],
  ['bridal set', 'bridal jewellery set', 'biyer set', 'bou set', 'wedding set', 'বিয়ের সেট', 'বউ সেট', 'ব্রাইডাল সেট'],
  ['gift set', 'gift box', 'gift pack', 'উপহার সেট', 'গিফট সেট'],
  ['gohona', 'gohna', 'gohonaa', 'gahana', 'gahona', 'jewellery', 'jewelry', 'jewelary', 'jwellery', 'ornaments', 'গহনা', 'গয়না', 'অলংকার', 'জুয়েলারি'],

  // ================= MATERIALS / FINISH / BRANDS =================
  ['gold', 'gold plated', 'goldplated', 'sona', 'sonar', 'golden', 'gold look', 'সোনা', 'সোনার', 'গোল্ড', 'গোল্ডেন', 'গোল্ড প্লেটেড'],
  ['city gold', 'citygold', 'city golds', 'সিটি গোল্ড', 'সিটিগোল্ড'],
  ['silver', 'silver plated', 'rupa', 'rupar', 'roopa', 'রুপা', 'রূপা', 'রুপার', 'সিলভার'],
  ['antique', 'antique finish', 'antic', 'antik', 'purono', 'purano', 'purono design', 'পুরাতন', 'পুরনো', 'পুরাতন ডিজাইন', 'আন্টিক', 'এন্টিক'],
  ['oxidised', 'oxidized', 'oxidise', 'oxidized silver', 'oxi', 'oxy', 'অক্সিডাইজড', 'অক্সি'],
  ['xuping', 'xuping jewellery', 'xuping gold', 'zuping', 'shuping', 'জুপিং', 'ক্সুপিং', 'সুপিং'],
  ['micro gold', 'micro plated', 'micro gold plated', 'মাইক্রো গোল্ড', 'মাইক্রো প্লেটেড'],
  ['one gram gold', '1 gram gold', 'one gram', 'ওয়ান গ্রাম গোল্ড', 'এক গ্রাম গোল্ড'],
  ['matte', 'matte finish', 'matt', 'ম্যাট', 'ম্যাট ফিনিশ'],
  ['rose gold', 'rose gold plated', 'rosegold', 'রোজ গোল্ড'],
  ['two tone', 'dual tone', 'gold silver', 'টু টোন', 'ডুয়াল টোন'],
  ['kundan', 'kundon', 'kundun', 'কুন্দন'],
  ['meenakari', 'minakari', 'meena', 'mina', 'মীনাকারি', 'মিনা', 'মিনাকারি'],
  ['polki', 'polky', 'পোলকি'],
  ['jadau', 'jarau', 'জড়োয়া', 'জাড়াউ'],
  ['stone', 'stone work', 'stone setting', 'pathor', 'pathar', 'পাথর', 'পাথরের কাজ'],
  ['cz', 'american diamond', 'ad', 'ad stone', 'zircon', 'zircons', 'আমেরিকান ডায়মন্ড', 'জিরকন'],
  ['pearl', 'pearls', 'moti', 'moti', 'মুক্তা', 'মতি', 'মোতি'],
  ['artificial', 'imitation', 'fashion jewellery', 'artificial jewellery', 'nokol', 'nakol', 'নকল', 'আর্টিফিশিয়াল', 'ফ্যাশন জুয়েলারি'],
  ['diamond', 'diamond cut', 'hira', 'heera', 'হীরা', 'হিরা', 'ডায়মন্ড'],
  ['ruby', 'red stone', 'lal pathor', 'চুনি', 'লাল পাথর'],
  ['emerald', 'green stone', 'sobuj pathor', 'panna', 'সবুজ পাথর', 'পান্না'],
  ['coral', 'pola stone', 'প্রবাল'],
  ['crystal', 'swarovski', 'ক্রিস্টাল'],

  // ================= BROOCH / ACCESSORIES =================
  ['brooch', 'broach', 'batch', 'badge', 'ব্রোচ', 'ব্যাজ'],
  ['pin', 'saree pin', 'sari pin', 'hijab pin', 'scarf pin', 'পিন', 'শাড়ি পিন', 'হিজাব পিন'],
  ['bindi', 'tip', 'tipp', 'টিপ', 'বিন্দি'],
  ['keychain', 'key ring', 'key chain', 'কিচেইন'],
  ['watch', 'wrist watch', 'ঘড়ি', 'ওয়াচ'],
  ['sunglass', 'sunglasses', 'চশমা'],

  // ================= OCCASION / STYLE =================
  ['bridal', 'biye', 'biyer', 'bou', 'wedding', 'bride', 'holud', 'বিয়ে', 'বিয়ের', 'বউ', 'বিয়ের গহনা', 'হলুদ'],
  ['party wear', 'party', 'party set', 'পার্টি', 'পার্টি ওয়্যার'],
  ['daily wear', 'regular', 'regular use', 'everyday', 'নিয়মিত ব্যবহারের', 'দৈনিক ব্যবহার'],
  ['festive', 'eid', 'puja', 'pujo', 'durga puja', 'ঈদ', 'পূজা', 'উৎসব'],
  ['kids jewellery', 'baby jewellery', 'kids', 'baby', 'bachcha', 'bachchader gohona', 'bachchar gohona', 'বাচ্চাদের গহনা', 'বাচ্চা', 'শিশুদের গহনা'],
  ['mens jewellery', 'gents jewellery', 'mens', 'gents', 'chelder gohona', 'ছেলেদের গহনা', 'পুরুষদের গহনা'],
  ['ladies jewellery', 'womens jewellery', 'ladies', 'meyeder gohona', 'মেয়েদের গহনা', 'নারীদের গহনা'],
  ['trendy', 'modern', 'latest', 'new design', 'new collection', 'notun', 'নতুন', 'নতুন ডিজাইন', 'ট্রেন্ডি'],
  ['traditional', 'oitijjho', 'ঐতিহ্যবাহী', 'ট্র্যাডিশনাল'],
  ['lightweight', 'light weight', 'halka', 'halka design', 'হালকা', 'হালকা ডিজাইন'],
  ['heavy', 'heavy design', 'bhari', 'bhari design', 'ভারী', 'ভারী ডিজাইন'],
];

/** Plain Levenshtein edit distance — used to suggest a close spelling when a search finds nothing. */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

/** English-readable vocabulary pulled from the synonym groups, for suggestions. */
export const ENGLISH_VOCAB = SYNONYM_GROUPS.flatMap((g) => g.filter((t) => /^[a-zA-Z ]+$/.test(t)));

/** Closest known term to a query that found no results, or null if nothing is close enough. */
export function closestSuggestion(query, vocabulary) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  let best = null;
  let bestDist = Infinity;
  for (const term of vocabulary) {
    const t = term.toLowerCase();
    if (t === q) continue;
    const d = levenshtein(q, t);
    const threshold = Math.max(2, Math.ceil(t.length * 0.4));
    if (d < bestDist && d <= threshold) {
      bestDist = d;
      best = term;
    }
  }
  return best;
}
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