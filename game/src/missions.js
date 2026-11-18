// Story missions for Solmaris Heat — an original five-chapter story.
// Mara Vela, a courier who swore she was out, takes one last week of jobs
// from fixer Lina Corvo across the city of Solmaris.

export const STORY_INTRO = [
  'Mara Vela came to Solmaris to disappear.',
  'Then Lina Corvo called in an old favour — and the city woke up.',
];

export const MISSIONS = [
  {
    id: 'meet-lina',
    title: 'Chapter 1 — Coffee at Coral Row',
    giver: 'Lina Corvo',
    objective: 'Meet Lina at Cafe Coral in Coral Row',
    target: { x: 575, y: 498 },
    reward: 150,
    dialog: [
      ['Lina', 'Mara. You look almost retired.'],
      ['Mara', 'I was retired, Lina. Past tense hurts.'],
      ['Lina', 'One week of driving. Easy money, quiet streets.'],
      ['Mara', 'Solmaris has never had a quiet street.'],
    ],
    doneText: 'Lina hired you. Find any car — press E beside one to take it.',
  },
  {
    id: 'harbor-run',
    title: 'Chapter 2 — The Harbor Run',
    giver: 'Lina Corvo',
    objective: 'Drive to Bruno\u2019s Harbor Garage in the Harbor Yards',
    target: { x: 2600, y: 852 },
    needsCar: true,
    reward: 300,
    dialog: [
      ['Lina', 'Bruno rebuilt a coupe for a client who never paid.'],
      ['Bruno', 'She runs sweet, Mara. Bring her home before dark.'],
      ['Mara', 'Everyone says that right before the sirens.'],
    ],
    doneText: 'Bruno owes you now. The garage is a friendly place.',
  },
  {
    id: 'lost-crates',
    title: 'Chapter 3 — Three Lost Crates',
    giver: 'Bruno Serra',
    objective: 'Recover the 3 lost supply crates around the city',
    crates: [
      { x: 985, y: 1236 }, { x: 1852, y: 852 }, { x: 2920, y: 1620 },
    ],
    reward: 550,
    dialog: [
      ['Bruno', 'A delivery van shed three crates all over Solmaris.'],
      ['Mara', 'And picking them up is a crime because…?'],
      ['Bruno', 'Because of what is printed on the side. Do not read it.'],
    ],
    doneText: 'All crates recovered. Whatever was inside, it was heavy.',
  },
  {
    id: 'heat-escape',
    title: 'Chapter 4 — Shake the Heat',
    giver: 'Lina Corvo',
    objective: 'You are hot! Reach the Laguna Flats safehouse',
    target: { x: 620, y: 2004 },
    raisesWanted: 2,
    reward: 700,
    dialog: [
      ['Lina', 'Half the precinct just lit up, Mara. MOVE.'],
      ['Mara', 'Tell me something I cannot hear through the sirens.'],
      ['Lina', 'Safehouse in Laguna Flats. Lose them or outrun them.'],
    ],
    doneText: 'Safe. For tonight, Solmaris forgets your face.',
  },
  {
    id: 'sunset-delivery',
    title: 'Chapter 5 — The Sunset Delivery',
    giver: 'Lina Corvo',
    objective: 'Deliver the golden coupe to Pier Nueve before the timer ends',
    target: { x: 3160, y: 1810 },
    needsCar: true,
    timer: 150,
    raisesWanted: 1,
    reward: 1200,
    dialog: [
      ['Lina', 'Last job. Golden coupe, Pier Nueve, before sunset.'],
      ['Mara', 'And if the whole city chases me there?'],
      ['Lina', 'Then arrive famous. It pays the same.'],
    ],
    doneText: 'Delivered. Mara Vela is out — this time she means it.',
  },
];

export const SIDE_ACTIVITIES = [
  'Taxi fares: stop near a waving pedestrian in a car to earn cash.',
  'Street crates glow gold — drive or walk through them for $40.',
  'Your wanted level cools down when police lose sight of you.',
];

export function missionMarker(mission, state) {
  if (!mission) return null;
  if (mission.crates) {
    const left = mission.crates.filter((c, i) => !state.cratesTaken.includes(i));
    return left[0] || null;
  }
  return mission.target || null;
}
