/**
 * Facts a brief on each topic should carry, given the recorded sources.
 * `evidence` is a pattern that must match a recorded source; the runner
 * refuses to score a fact whose evidence is no longer in the snapshot, so a
 * re-recorded case cannot silently keep stale expectations.
 *
 * REVIEW STATUS: these were drafted from the recorded headlines and have not
 * been checked by a person. Set `reviewed: true` on a case once someone has
 * read its snapshot and agrees the list is right and complete.
 */
export type ExpectedFact = { fact: string; evidence: RegExp };

export const EXPECTATIONS: Record<string, { reviewed: boolean; facts: ExpectedFact[] }> = {
  sudan: {
    reviewed: false,
    facts: [
      { fact: "A driver was killed in an air attack on aid trucks in South Kordofan.", evidence: /driver killed in aerial attack on aid trucks/i },
      { fact: "A drone strike killed four women in Blue Nile state.", evidence: /drone strike kills 4 women/i },
      { fact: "Army chief al-Burhan vowed to retake all territory held by the RSF.", evidence: /burhan.*retake all territory/i },
    ],
  },
  "gaza-ceasefire": {
    reviewed: false,
    facts: [
      { fact: "Israeli strikes on Gaza on the October 7 anniversary killed three people.", evidence: /israel strikes gaza on october 7 anniversary, three dead/i },
      { fact: "The WHO appealed for a large increase in aid to Gaza before winter.", evidence: /who appeals for massive aid influx/i },
      { fact: "A UN agency reported a surge in violence against women in Gaza.", evidence: /violence against women in gaza surge/i },
    ],
  },
  "ukraine-front-line": {
    reviewed: false,
    facts: [
      { fact: "Russian strikes in Ukraine caused heavy casualties, including children.", evidence: /children among heavy casualties|including 5 children/i },
      { fact: "Zelenskyy said intelligence shows Russia is preparing a massive attack.", evidence: /intelligence shows russia is preparing massive attack/i },
    ],
  },
  "red-sea-shipping": {
    reviewed: false,
    facts: [
      { fact: "The Houthis seized part of Yemen's Red Sea coast.", evidence: /houthis (seized|trounced).*red sea|took red sea/i },
      { fact: "A product tanker was attacked in the Red Sea.", evidence: /product tanker attacked in red sea/i },
    ],
  },
  myanmar: {
    reviewed: false,
    facts: [
      { fact: "Malaysia sent Myanmar migrants back to Myanmar.", evidence: /myanmar (migrants|nationals).*(returned|sent back)|returned.*myanmar nationals/i },
      { fact: "The Irrawaddy counted 383 civilians killed in 21 massacres in Rakhine.", evidence: /383 civilians in 21 rakhine massacres/i },
    ],
  },
  "yemen-houthis": {
    reviewed: false,
    facts: [
      { fact: "Yemen's government announced a major offensive to retake land from the Houthis.", evidence: /government (announces all-out war|declares a major operation)/i },
      { fact: "The Houthis attacked Aden airport.", evidence: /aden airport/i },
    ],
  },
  "haiti-gangs": {
    reviewed: false,
    facts: [
      { fact: "The UN reported more than 5,000 people killed or injured as gangs expanded.", evidence: /more than 5,000 people killed or injured/i },
      { fact: "The UN extended the mission against gangs in Haiti.", evidence: /un extends mission/i },
    ],
  },
  "lebanon-israel": {
    reviewed: false,
    facts: [{ fact: "Shots were fired at a UN peacekeeping (UNIFIL) post on the Israel-Lebanon border.", evidence: /shots fired at (unifil )?post/i }],
  },
  "dr-congo-m23": {
    reviewed: false,
    facts: [{ fact: "Mediators met Rwanda's President Kagame and M23 rebels about the peace process.", evidence: /mediators meet with kagame and m23/i }],
  },
  "south-sudan": {
    reviewed: false,
    facts: [{ fact: "South Sudan rejected claims that it had ordered foreigners to leave.", evidence: /rejects claims of foreigners' expulsion order/i }],
  },
};
