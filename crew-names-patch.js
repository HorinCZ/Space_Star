(function () {
  const origins = [
    {
      first: ["Tavon", "Sarek", "Tolar", "Veyla", "Selin", "T'Len", "Marik", "Sovan", "Neral", "Kirel"],
      last: ["T'Var", "Sorel", "Vanik", "T'Lora", "Satik", "Miren", "Kovar", "Talan", "Soval", "Varek"]
    },
    {
      first: ["Thalen", "Shira", "Keth", "Vora", "Jalen", "Rynn", "Tressa", "Lethar", "Zhara", "Darin"],
      last: ["ch'Raal", "zh'Taren", "th'Vor", "sh'Kelis", "ch'Seren", "zh'Voss", "th'Rin", "sh'Dorel", "ch'Zaan", "zh'Kel"]
    },
    {
      first: ["Korun", "Drel", "Mavok", "Torga", "Rellan", "Vek", "Jorim", "Berek", "Nola", "Perren"],
      last: ["Grenn", "Vosk", "Morga", "Teb", "Donn", "Rask", "Pell", "Gral", "Varn", "Mekk"]
    },
    {
      first: ["Mira", "Jonas", "Elena", "Rafael", "Naomi", "Kiran", "Amara", "Tomas", "Leah", "Nico"],
      last: ["Vale", "Archer", "Sato", "Torres", "Reed", "Kim", "Hayes", "Marquez", "Patel", "Novak"]
    },
    {
      first: ["Aryn", "Keva", "Dalen", "Neris", "Liora", "Merek", "Tavi", "Jessa", "Rovan", "Syla"],
      last: ["Toran", "Nerys", "Bareil", "Lenar", "Opaka", "Varis", "Damar", "Kiraal", "Toma", "Ril"]
    },
    {
      first: ["Zhen", "Riva", "Tarek", "Suri", "Malon", "Iren", "Kova", "Elior", "Vessa", "Orin"],
      last: ["Daxen", "Vel", "Renn", "Talas", "Kora", "Senn", "Virek", "Mora", "Jorel", "Lun"]
    }
  ];

  function loadSave() {
    try {
      return JSON.parse(localStorage.getItem("lunarFleetSave") || "null") || {};
    } catch (error) {
      return {};
    }
  }

  function usedCrewNames() {
    const save = loadSave();
    const names = new Set();
    (save.crew || []).forEach((member) => {
      if (member && member.name) names.add(member.name);
    });
    return names;
  }

  function createCrewName() {
    const used = usedCrewNames();
    for (let attempt = 0; attempt < 160; attempt += 1) {
      const origin = origins[Math.floor(Math.random() * origins.length)];
      const first = origin.first[Math.floor(Math.random() * origin.first.length)];
      const last = origin.last[Math.floor(Math.random() * origin.last.length)];
      const name = `${first} ${last}`;
      if (!used.has(name)) return name;
    }

    const save = loadSave();
    const suffix = String((save.nextCrewId || used.size + 1)).padStart(3, "0");
    return `Federation Cadet ${suffix}`;
  }

  window.generateCrewName = createCrewName;
  try {
    generateCrewName = createCrewName;
  } catch (error) {
    window.generateCrewName = createCrewName;
  }
})();
