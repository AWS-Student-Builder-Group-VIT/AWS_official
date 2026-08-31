import { useState, useRef } from 'react';

// ==========================================================
// 1. DATA: ALL 25 CASES
// ==========================================================
const CASES = [
  {
    title: "The Blackwood Vanishing", place: "Blackwood Manor",
    brief: "Art collector Edwin Blackwood was found unconscious in his locked study, his ruby brooch missing. Three people were in the house that night.",
    suspects: [
      { name: "Harriet Voss", role: "Housekeeper", alibi: "Says she was ironing linens all evening.", motive: "Owed three months' back wages." },
      { name: "Neil Ashcombe", role: "Business Partner", alibi: "Claims he left at 9 PM, before the study was locked.", motive: "Blackwood was about to expose his fraud." },
      { name: "Desmond Wren", role: "Nephew", alibi: "Claims he was asleep from 8:30 PM onward.", motive: "Stands to inherit everything." }
    ],
    clues: [
      { label: "Muddy Print", text: "A muddy boot print sits on the study windowsill — the window was left ajar, suggesting entry from outside." },
      { label: "Burned Ledger", text: "A torn, half-burned ledger page in the fireplace shows numbers matching a partnership fraud." },
      { label: "Gatehouse Log", text: "The gatehouse sign-out sheet shows Neil's car didn't leave until 11:40 PM — three hours after he claims." }
    ],
    culprit: 1, keyClue: 2,
    solution: "Neil Ashcombe never left the estate. The gatehouse log destroys his alibi, and the burned ledger gives him a motive strong enough to silence Blackwood for good."
  },
  {
    title: "The Gallery Ghost", place: "Ashford Gallery",
    brief: "A prized landscape painting vanished from the gallery's east wall overnight, with no sign of forced entry.",
    suspects: [
      { name: "Mara Quill", role: "Curator", alibi: "Says she left at closing time, 6 PM sharp.", motive: "Wanted to sell the piece privately to cover gallery debts." },
      { name: "Otis Bram", role: "Security Guard", alibi: "Claims he was on rounds all night and saw nothing.", motive: "Owed money to a collector who wanted the painting." },
      { name: "Ines Cadel", role: "Rival Artist", alibi: "Says she was home, alone, all night.", motive: "Resented the painting outselling her own work." }
    ],
    clues: [
      { label: "Access Log", text: "The gallery's badge log shows the east wing alarm was disabled at 11 PM using the guard's credentials." },
      { label: "Camera Gap", text: "Security footage cuts out for exactly seventeen minutes, resuming just before the guard's next round." },
      { label: "Pawn Ticket", text: "A pawn shop receipt for 'one framed landscape' turns up in a bin behind the gallery, dated that night." }
    ],
    culprit: 1, keyClue: 0,
    solution: "Otis Bram used his own credentials to disable the alarm and cut the cameras during his own patrol window — the perfect cover, since guards aren't usually suspects."
  },
  {
    title: "Recipe for Trouble", place: "Della's Bakery",
    brief: "Della's award-winning sourdough recipe disappeared from the locked recipe box the morning before the county fair.",
    suspects: [
      { name: "Sam Okafor", role: "Apprentice Baker", alibi: "Says he was prepping dough from 5 AM, alone.", motive: "Wanted to enter the fair under his own name." },
      { name: "Priya Nandan", role: "Delivery Driver", alibi: "Claims she only dropped off flour and left.", motive: "None obvious — barely knows the recipe exists." },
      { name: "Ruth Calder", role: "Della's Former Business Partner", alibi: "Says she hasn't been near the bakery in months.", motive: "Split from Della bitterly and opened a rival bakery nearby." }
    ],
    clues: [
      { label: "Torn Card", text: "A torn corner of a recipe card, matching the missing one, is found stuck to a delivery crate from Ruth's shop." },
      { label: "Bakery Trash", text: "A near-identical sourdough recipe appears taped to the counter at Ruth's new bakery two days later." },
      { label: "Door Log", text: "The bakery's side door shows a key was used at 4:40 AM — before Sam's shift even started." }
    ],
    culprit: 2, keyClue: 1,
    solution: "Ruth Calder still had a spare key from her partnership days. The recipe appearing at her new bakery within two days seals it — she let herself in before anyone else arrived."
  },
  {
    title: "Opening Night Sabotage", place: "The Regal Theater",
    brief: "Minutes before opening night, the lead actress's prop sword was swapped for a bent, useless one — nearly ruining the show.",
    suspects: [
      { name: "Wren Halloway", role: "Understudy", alibi: "Says she was in the dressing room alone, rehearsing lines.", motive: "Wanted the lead actress to fumble and be replaced." },
      { name: "Colm Baptiste", role: "Stage Manager", alibi: "Claims he was checking lighting cues backstage.", motive: "Feuding with the director over the production budget." },
      { name: "Vera Nash", role: "Theater Critic", alibi: "Says she arrived just before curtain, with the rest of the audience.", motive: "Wanted a dramatic story to write about." }
    ],
    clues: [
      { label: "Sign-In Sheet", text: "The backstage sign-in sheet shows only Wren signed in during the prop swap window — everyone else arrived later." },
      { label: "Prop Room", text: "The bent sword is found stuffed behind a costume rack, wiped clean of dust unlike everything around it." },
      { label: "Whispered Note", text: "A note in Wren's dressing room reads 'she'll finally see what I can do' — unsigned, but in her handwriting." }
    ],
    culprit: 0, keyClue: 0,
    solution: "Only Wren was backstage during the swap window, and the note in her own handwriting confirms she wanted the spotlight for herself."
  },
  {
    title: "The Vanishing Trophy", place: "Oakridge Sports Club",
    brief: "The club's decades-old championship trophy disappeared from its display case the night before the anniversary gala.",
    suspects: [
      { name: "Deja Marsh", role: "Rival Team Captain", alibi: "Says she was at a team dinner all evening.", motive: "Wanted to embarrass Oakridge before a big match." },
      { name: "Tobias Wren", role: "Groundskeeper", alibi: "Claims he locked up and went straight home.", motive: "Passed over for a promotion he felt he deserved." },
      { name: "Nora Kessler", role: "Club Treasurer", alibi: "Says she was reviewing gala paperwork in her office.", motive: "Has been quietly covering a shortfall in the club's accounts." }
    ],
    clues: [
      { label: "Display Case", text: "The display case was unlocked with a key, not forced — only three people hold keys to it." },
      { label: "Pawn Ticket", text: "A pawn shop ticket for 'one large silver trophy' is found in a desk drawer, dated the night it vanished." },
      { label: "Dinner Reservation", text: "The rival team's dinner reservation confirms Deja was seated with twelve teammates the entire evening." }
    ],
    culprit: 2, keyClue: 1,
    solution: "Nora Kessler pawned the trophy to buy time on the shortfall she'd been hiding. Deja's alibi checks out, and the key-only entry points straight to Nora."
  },
  {
    title: "Ink & Deception", place: "Fenwick Trust Bank",
    brief: "A large business loan was approved on a forged signature — and the real client insists he never signed anything.",
    suspects: [
      { name: "Ada Solis", role: "Teller", alibi: "Says she only processed the paperwork after it was already signed.", motive: "None found — she has no financial stake in the loan." },
      { name: "Ray Dunmore", role: "Loan Officer", alibi: "Claims the client signed in front of him personally.", motive: "Earns a commission on every approved loan, paid in full up front." },
      { name: "Els Vance", role: "Client's Business Partner", alibi: "Says he was traveling out of state that week.", motive: "Needed the loan approved to save the failing business." }
    ],
    clues: [
      { label: "Handwriting Sample", text: "A handwriting expert notes the forged signature's loops match samples of Ray's own writing style, not the client's." },
      { label: "Travel Records", text: "Els Vance's flight and hotel records confirm he was genuinely out of state on the signing date." },
      { label: "Commission Slip", text: "Ray's commission slip for this exact loan was submitted a full day before the client's signing appointment." }
    ],
    culprit: 1, keyClue: 0,
    solution: "Ray forged the signature himself to push the loan through early and collect his commission — the handwriting match and the suspiciously early commission slip give him away."
  },
  {
    title: "The Lost Manuscript", place: "Harrow Library",
    brief: "A rare 400-year-old manuscript vanished from the archive's locked reading room overnight.",
    suspects: [
      { name: "Beatrix Osei", role: "Archivist", alibi: "Says she locked the reading room at closing and went home.", motive: "None apparent — has protected the collection for decades." },
      { name: "Julian Ferro", role: "Visiting Scholar", alibi: "Claims he left the library well before closing.", motive: "Has a private collection and a reputation for 'borrowing' rare texts." },
      { name: "Priya Shah", role: "Library Intern", alibi: "Says she was reshelving books until closing.", motive: "None found — new to the job, unlikely to have buyers lined up." }
    ],
    clues: [
      { label: "Sign-Out Sheet", text: "The reading room sign-out sheet shows Julian's name entered again at 9:40 PM, after his claimed departure." },
      { label: "Online Listing", text: "A manuscript closely matching the missing one appears for sale on a private collectors' forum three days later." },
      { label: "Glove Fibers", text: "White cotton glove fibers, the kind used for handling rare texts, are found on the reading room door handle." }
    ],
    culprit: 1, keyClue: 0,
    solution: "Julian returned after his claimed departure, as the sign-out sheet shows, and the manuscript surfacing on a collectors' forum days later confirms where it went."
  },
  {
    title: "Static on the Line", place: "Vertex Technologies",
    brief: "A confidential client database was leaked to a competitor just hours after a product meeting.",
    suspects: [
      { name: "Marcus Diallo", role: "IT Administrator", alibi: "Says he was patching servers remotely that night.", motive: "None found — has full legitimate access to the database anyway." },
      { name: "Callie Fenn", role: "New Hire", alibi: "Claims she left the office right after the meeting.", motive: "Was passed over for a full-time offer the week before." },
      { name: "Owen Pryce", role: "Disgruntled Former Employee", alibi: "Says he hasn't set foot in the building since he was let go.", motive: "Was fired abruptly and has been vocal about it online." }
    ],
    clues: [
      { label: "Login Timestamp", text: "Server logs show a login under Callie's credentials at 11:52 PM, well after she claims to have left." },
      { label: "Badge Swipe", text: "Owen's badge was deactivated the day he was let go and shows no swipes anywhere near the leak date." },
      { label: "Forum Post", text: "A private message from Callie's personal account offers 'insider data' to a competitor's recruiter, sent that same night." }
    ],
    culprit: 1, keyClue: 2,
    solution: "Callie's own message offering the data away is damning on its own, and the late-night login under her credentials confirms she never actually left."
  },
  {
    title: "The Jewel Box Job", place: "Lumen Jewelers",
    brief: "A diamond necklace vanished from the store's back safe, which shows no signs of forced entry.",
    suspects: [
      { name: "Theo Vance", role: "Owner's Son", alibi: "Says he was out with friends the whole evening.", motive: "Racking up gambling debts he's hidden from his father." },
      { name: "Gita Ruiz", role: "Cleaner", alibi: "Claims she cleaned the front room only and never touched the back.", motive: "Struggling to cover a family medical bill." },
      { name: "Nadia Okoro", role: "Regular Customer", alibi: "Says she was in that day, but left before closing.", motive: "None found — a longtime, well-known customer." }
    ],
    clues: [
      { label: "Spare Key", text: "A duplicate safe key, cut recently, is found taped beneath a drawer in the cleaning supply closet." },
      { label: "Pawn Record", text: "A pawn shop three towns over logs a necklace matching the description, sold by a woman matching Gita's description." },
      { label: "Friend Alibi", text: "Theo's friends confirm, independently, that he was with them the entire evening." }
    ],
    culprit: 1, keyClue: 1,
    solution: "Gita cut a spare key to the safe and pawned the necklace out of town to avoid recognition — the matching pawn record, far from home, seals it."
  },
  {
    title: "Marble & Malice", place: "Ferngate Park",
    brief: "A newly unveiled park statue was found covered in paint overnight, just days after its dedication.",
    suspects: [
      { name: "Idris Voss", role: "Rival Sculptor", alibi: "Says he was in his studio all night, working.", motive: "Furious that his own proposal lost the park commission." },
      { name: "Councilwoman Reyes", role: "City Council Member", alibi: "Claims she was at a council dinner until midnight.", motive: "Publicly opposed funding the statue from the start." },
      { name: "Deshawn Cole", role: "Local Teenager", alibi: "Says he was at a friend's house all night.", motive: "None found — has no history with the artist or the park." }
    ],
    clues: [
      { label: "Paint Match", text: "The paint used matches a specialty brand sold in only one shop in town — one that keeps a purchase log." },
      { label: "Purchase Log", text: "The shop's purchase log shows Idris bought that exact paint two days before the vandalism." },
      { label: "Dinner Guest List", text: "The council dinner's guest list and photos confirm Reyes was present the entire evening." }
    ],
    culprit: 0, keyClue: 1,
    solution: "The specialty paint traces directly back to Idris's purchase two days prior — a clear sign of premeditation from a sculptor still smarting over the lost commission."
  },
  {
    title: "The Lucky Ticket", place: "Lakeside Lottery Office",
    brief: "A winning lottery ticket was swapped for a losing one before the prize could be claimed.",
    suspects: [
      { name: "Farrah Diab", role: "Ticket Clerk", alibi: "Says she processed tickets normally all shift.", motive: "Deep in debt after a family emergency." },
      { name: "Walt Okonkwo", role: "Regular Player", alibi: "Claims he bought his ticket and left immediately.", motive: "None found — plays weekly like hundreds of others." },
      { name: "Lena Vasquez", role: "Office Manager", alibi: "Says she was in the back office doing paperwork.", motive: "Under pressure to cover a shortfall from a bad investment." }
    ],
    clues: [
      { label: "Register Footage", text: "Footage shows Farrah handling the winning ticket at the counter, alone, for nearly a full minute before filing it." },
      { label: "Filing Discrepancy", text: "The ticket filed afterward doesn't match the winning number on record, though it's in the same slot." },
      { label: "Office Sign-In", text: "Lena's sign-in and sign-out times account for every minute she was in the back office." }
    ],
    culprit: 0, keyClue: 0,
    solution: "The footage shows Farrah alone with the ticket right before the swap, and Lena's accounted-for time clears her — the debt-driven clerk had both motive and opportunity."
  },
  {
    title: "Steeped in Suspicion", place: "Willow Tea House",
    brief: "The tea house's secret signature blend recipe went missing days before it appeared, nearly identical, at a rival cafe.",
    suspects: [
      { name: "Noor Aziz", role: "Barista", alibi: "Says she was closing up alone that night.", motive: "Recently applied for a job at the rival cafe." },
      { name: "Baxter Lowe", role: "Rival Cafe Owner", alibi: "Claims he's never even visited Willow Tea House.", motive: "Needed a signature drink to compete with Willow's growing popularity." },
      { name: "Priti Rao", role: "Tea Supplier", alibi: "Says she only delivers ingredients and has no reason to snoop.", motive: "Supplies both cafes and could profit from a bigger rival order." }
    ],
    clues: [
      { label: "Supplier Invoice", text: "An invoice shows Baxter ordered the exact same rare tea blend components the week before his 'new' drink launched." },
      { label: "Closing Log", text: "Noor's closing checklist and time-stamped photos account for her being alone but never near the recipe binder." },
      { label: "Recipe Binder", text: "The recipe binder's lock shows scratch marks consistent with a key that isn't Willow's — a key style Baxter's shop uses." }
    ],
    culprit: 1, keyClue: 0,
    solution: "Baxter's suspiciously well-timed ingredient order and the mismatched lock scratches point straight at him — he needed Willow's exact blend to compete."
  },
  {
    title: "Full Steam Ahead", place: "The Meridian (Cruise Ship)",
    brief: "The ship's engine was sabotaged the night before departure, delaying hundreds of passengers.",
    suspects: [
      { name: "Chief Engineer Alva Ruiz", role: "Ship Engineer", alibi: "Says she inspected the engine room and left it in working order.", motive: "None found — her job depends on the ship running smoothly." },
      { name: "Denny Okafor", role: "Rival Cruise Line Rep", alibi: "Claims he was never near the engine room, just checking out the ship as a 'tourist'.", motive: "Wants to poach delayed passengers for his own line's next sailing." },
      { name: "Marisol Feld", role: "Disgruntled Passenger", alibi: "Says she was in her cabin the whole night, upset about a room mix-up.", motive: "Furious about being downgraded from her booked suite." }
    ],
    clues: [
      { label: "Access Badge", text: "A guest badge, not a crew badge, was used to open the engine room door at 2 AM — logged automatically." },
      { label: "Hotel Room Key", text: "A rival cruise line's hotel key card is found dropped near the engine room entrance." },
      { label: "Flyers", text: "Flyers advertising the rival cruise line's 'instant rebooking discount' are later found stashed near the ship's gangway." }
    ],
    culprit: 1, keyClue: 1,
    solution: "The dropped hotel key from the rival cruise line, combined with the guest-badge entry and rebooking flyers, points squarely at Denny trying to steal passengers."
  },
  {
    title: "Exam Room Leak", place: "Crestwood High School",
    brief: "Copies of the final exam appeared online the night before the test, and only a handful of people had access.",
    suspects: [
      { name: "Ms. Talia Brooks", role: "Teacher's Aide", alibi: "Says she filed the exams in the locked cabinet and went home.", motive: "None apparent — has never been in trouble before." },
      { name: "Ezra Kim", role: "Top Student", alibi: "Claims he was studying at home all night, alone.", motive: "Needed a top score to keep his scholarship, and was struggling in this subject." },
      { name: "Mr. Dale Osei", role: "Janitor", alibi: "Says he cleaned the classroom after hours as usual.", motive: "None found — no known connection to the exam or the student." }
    ],
    clues: [
      { label: "Printer Log", text: "The school's printer log shows the exam file was printed again at 10 PM, hours after Ms. Brooks filed it." },
      { label: "Locker Search", text: "A copy of the exam, folded the same way as the leaked images, is found in Ezra's locker." },
      { label: "Cabinet Lock", text: "The locked cabinet shows no signs of tampering, meaning whoever accessed it had a legitimate key or the file wasn't in there at all." }
    ],
    culprit: 1, keyClue: 1,
    solution: "The exam copy found folded exactly like the leaked photos, paired with the late-night reprint, points to Ezra — who needed a perfect score more than anyone."
  },
  {
    title: "Brushed With Fraud", place: "Sterling Auction House",
    brief: "A painting sold as an original masterwork turned out to be a forgery — and the buyer wants answers.",
    suspects: [
      { name: "Colette Marsh", role: "Art Appraiser", alibi: "Says she authenticated the piece in good faith.", motive: "Earns a percentage of the final sale price." },
      { name: "Hugo Delacroix", role: "Auctioneer", alibi: "Claims he simply ran the auction as presented to him.", motive: "Needed a big sale to save the auction house's reputation." },
      { name: "Anonymous Seller (Rene Fabel)", role: "Original Seller", alibi: "Says he inherited the piece and had no idea it wasn't real.", motive: "Needed money quickly after a business collapse." }
    ],
    clues: [
      { label: "Paint Analysis", text: "A lab test shows the paint contains a synthetic compound that didn't exist when the 'original' was supposedly made." },
      { label: "Authentication Slip", text: "Colette's signed authentication slip was dated before the painting even completed standard lab testing procedures." },
      { label: "Sale History", text: "Rene's sale records show he disclosed the piece as 'unverified' when he brought it in — a note that vanished from later paperwork." }
    ],
    culprit: 0, keyClue: 1,
    solution: "Colette signed off before proper testing was even done, skipping the process for her commission — the missing disclosure note shows the fraud was covered up after Rene's honest submission."
  },
  {
    title: "Gala Under the Table", place: "Riverside Charity Gala",
    brief: "Cash donations from the night's silent auction went missing from the venue's safe before it could be deposited.",
    suspects: [
      { name: "Priscilla Nguyen", role: "Event Coordinator", alibi: "Says she handed the cash box to the safe herself and left.", motive: "None found — has run this gala for years without incident." },
      { name: "Board Member Alan Vasquez", role: "Charity Board Member", alibi: "Claims he left the venue right after his speech.", motive: "Has mounting gambling debts he's kept hidden from the board." },
      { name: "Chef Louis Pham", role: "Caterer", alibi: "Says he was in the kitchen packing up the entire time.", motive: "None found — paid a flat catering fee regardless of donations." }
    ],
    clues: [
      { label: "Safe Code Log", text: "The safe's electronic log shows it was opened at 11:15 PM using a code only Priscilla and Alan know." },
      { label: "Speech Timing", text: "Video of the event shows Alan was still on stage at 11:15 PM, giving his closing remarks." },
      { label: "Coordinator Alibi", text: "Valet records confirm Priscilla's car left the venue at 11:10 PM, before the safe was opened." }
    ],
    culprit: 1, keyClue: 0,
    solution: "Only Alan and Priscilla knew the code, and both other clues clear them individually — except the timing shows Alan could have slipped away right after his speech ended, just before the log entry."
  },
  {
    title: "The Faulty Formula", place: "Bellweather Research Lab",
    brief: "A researcher's breakthrough experiment was sabotaged the night before a critical grant review.",
    suspects: [
      { name: "Dr. Simone Achebe", role: "Rival Researcher", alibi: "Says she was working late on her own unrelated project.", motive: "Is competing for the same limited grant funding." },
      { name: "Tom Whitfield", role: "Lab Assistant", alibi: "Claims he left right after his shift ended at 8 PM.", motive: "None found — new to the lab, eager to please." },
      { name: "Dr. Harlan Voss", role: "Department Head", alibi: "Says he was reviewing budget reports in his office.", motive: "Wanted a smaller, 'safer' project funded instead, to protect department stability." }
    ],
    clues: [
      { label: "Badge Access", text: "The lab's badge log shows Simone entered the restricted lab at 11:40 PM, hours after her own project's lab closed." },
      { label: "Grant Application", text: "Simone's own competing grant application was submitted for review the very next morning." },
      { label: "Office Log", text: "Dr. Voss's office computer shows continuous activity on budget files all night, matching his alibi." }
    ],
    culprit: 0, keyClue: 0,
    solution: "Simone had no reason to be in a lab that wasn't hers late at night — except to sabotage the competition for the grant she was about to submit for herself."
  },
  {
    title: "Suite Trouble", place: "The Ambrose Hotel",
    brief: "A guest's jewelry vanished from their in-room safe despite no signs of forced entry.",
    suspects: [
      { name: "Jamal Fife", role: "Bellhop", alibi: "Says he only carried bags to the room and left immediately.", motive: "None found — new employee, clean record." },
      { name: "Rosa Delgado", role: "Housekeeping Staff", alibi: "Claims she cleaned the room per her normal schedule.", motive: "None apparent — long-tenured, trusted staff member." },
      { name: "Fellow Guest 'Mr. Renard'", role: "Guest in Adjacent Suite", alibi: "Says he was in his own room the entire stay.", motive: "Matches the description of a known hotel-theft scammer from another city." }
    ],
    clues: [
      { label: "Key Card Log", text: "The room's key card log shows an unregistered card was used to enter at 3 AM — cloned from the master system." },
      { label: "Guest Registry", text: "'Mr. Renard' checked in using an alias that matches a name flagged in a different city's hotel-theft reports." },
      { label: "Housekeeping Schedule", text: "Rosa's cleaning schedule and swipe times account for every minute, with no gaps around the theft window." }
    ],
    culprit: 2, keyClue: 1,
    solution: "The cloned key card and the alias matching a known scammer's pattern both point to 'Mr. Renard' — Rosa's schedule fully accounts for her time, ruling her out."
  },
  {
    title: "The Show Dog Switcheroo", place: "Crestview Dog Show",
    brief: "The favorite to win Best in Show performed sluggishly after his food was tampered with hours before judging.",
    suspects: [
      { name: "Bianca Reyes", role: "Rival Handler", alibi: "Says she was grooming her own dog the entire morning.", motive: "Wanted her own dog to finally take the top prize." },
      { name: "Petra Lindqvist", role: "Groomer", alibi: "Claims she only handled brushing and coat prep, nothing else.", motive: "None found — paid the same regardless of results." },
      { name: "Cole Danby", role: "Judge's Assistant", alibi: "Says he was organizing scorecards backstage all morning.", motive: "None apparent — has no dog or handler connections in the show." }
    ],
    clues: [
      { label: "Feed Receipt", text: "A feed store receipt shows Bianca purchased a specific ingredient known to cause sluggishness in dogs, two days prior." },
      { label: "Kennel Access", text: "Kennel sign-in sheets show Bianca visited the favorite's kennel area that morning, despite having no dog stationed there." },
      { label: "Grooming Schedule", text: "Petra's grooming schedule is confirmed by three other handlers who saw her working continuously all morning." }
    ],
    culprit: 0, keyClue: 1,
    solution: "Bianca had no reason to be near a kennel that wasn't hers, and the feed store receipt for the exact tampering ingredient makes her motive concrete."
  },
  {
    title: "Chapter and Verse", place: "Willowmere Publishing House",
    brief: "An unreleased novel's full manuscript leaked online weeks before its official release date.",
    suspects: [
      { name: "Freya Lindholm", role: "Editor", alibi: "Says she only had the manuscript on her work computer, never shared it.", motive: "None found — her career depends on protecting client manuscripts." },
      { name: "Garrett Voss", role: "Literary Agent", alibi: "Claims he never shares client work before release, as a matter of principle.", motive: "Was quietly negotiating a bigger deal for the same author with a rival publisher." },
      { name: "Dara Okonjo", role: "Cover Designer", alibi: "Says she only had access to sample chapters for the cover art.", motive: "None apparent — freelance designer with no stake in the leak." }
    ],
    clues: [
      { label: "Email Metadata", text: "Email metadata shows the full manuscript file was sent from Garrett's account to an unknown address two weeks before the leak." },
      { label: "File Access Log", text: "Dara's account only ever accessed three sample chapters, matching her role exactly, with no full-manuscript downloads." },
      { label: "Negotiation Trail", text: "Messages recovered from Garrett's assistant confirm ongoing 'exploratory talks' with a rival publisher during the leak window." }
    ],
    culprit: 1, keyClue: 0,
    solution: "The email metadata showing Garrett sent the full manuscript out, combined with his rival-publisher negotiations, makes it clear he leaked it to leverage a bigger deal."
  },
  {
    title: "Iced Out", place: "The Hensley Wedding",
    brief: "The wedding cake's flavor was secretly swapped just before the reception, ruining a carefully planned surprise.",
    suspects: [
      { name: "Marco Belline", role: "Rival Bakery Owner", alibi: "Says he was at his own shop the entire day.", motive: "Furious he lost the wedding contract to a competing bakery." },
      { name: "Yvette Toure", role: "Wedding Planner", alibi: "Claims she was coordinating the ceremony and never near the cake table.", motive: "None found — her reputation depends on a flawless event." },
      { name: "Priya Hensley", role: "Bride's Sister", alibi: "Says she was getting ready with the bridal party all afternoon.", motive: "Has a history of sibling rivalry and disliked the groom's cake choice." }
    ],
    clues: [
      { label: "Delivery Van", text: "A delivery van matching Marco's shop was spotted near the venue's kitchen entrance an hour before the swap." },
      { label: "Ingredient Receipt", text: "A receipt for the exact swapped flavor's ingredients, purchased that morning, is found in Marco's shop trash." },
      { label: "Bridal Party Photos", text: "Timestamped photos confirm Priya was with the bridal party continuously from noon until the ceremony began." }
    ],
    culprit: 0, keyClue: 0,
    solution: "The delivery van near the kitchen and the matching ingredient receipt both trace back to Marco, still smarting over losing the contract."
  },
  {
    title: "The Missing Melody", place: "Solstice Music Festival",
    brief: "The headliner's handwritten setlist and sheet music vanished from their tour case just before showtime.",
    suspects: [
      { name: "Ravi Sandhu", role: "Opening Act", alibi: "Says he was warming up backstage the whole time.", motive: "Wanted a timeslot swap to play during the peak festival crowd." },
      { name: "Delphine Marchetti", role: "Sound Engineer", alibi: "Claims she was calibrating the main stage sound system.", motive: "None apparent — has worked with the headliner for years without issue." },
      { name: "Festival Promoter Cass Ryder", role: "Festival Promoter", alibi: "Says she was handling last-minute logistics at the front gate.", motive: "Under pressure from sponsors to feature Ravi in a better slot." }
    ],
    clues: [
      { label: "Backstage Badge Log", text: "The badge log shows Ravi's badge scanned into the headliner's private tour area, a zone he had no reason to enter." },
      { label: "Sheet Music Found", text: "The missing sheet music turns up folded inside Ravi's own gear bag during a routine security sweep." },
      { label: "Sound Booth Log", text: "Delphine's sound booth login shows continuous activity calibrating levels during the entire theft window." }
    ],
    culprit: 0, keyClue: 1,
    solution: "Finding the sheet music in his own bag is hard to explain away, and the badge log confirms Ravi had no legitimate reason to be in that private area at all."
  },
  {
    title: "Silent Auction, Loud Lies", place: "Crestwood Elementary Fundraiser",
    brief: "Winning bids on the school's silent auction items were mysteriously altered after the bidding closed.",
    suspects: [
      { name: "Denise Okafor", role: "PTA Volunteer", alibi: "Says she was managing the check-in table the entire evening.", motive: "Wanted a specific auction item — a vacation package — for herself." },
      { name: "Marco Villanueva", role: "Vendor Representative", alibi: "Claims he packed up his booth and left before bidding closed.", motive: "None found — vendors don't benefit from altered bids." },
      { name: "Parent Kayla Simmons", role: "Attending Parent", alibi: "Says she was chatting with other parents near the dessert table.", motive: "None apparent — bid on smaller items only, all within budget." }
    ],
    clues: [
      { label: "Bid Sheet Handwriting", text: "A handwriting comparison shows the altered final bid on the vacation package matches Denise's handwriting on other forms." },
      { label: "Check-In Log", text: "The check-in table log shows Denise stepped away from her post for twelve unaccounted minutes right after bidding closed." },
      { label: "Vendor Departure", text: "Parking lot camera timestamps confirm Marco's van left a full 40 minutes before the bidding period even ended." }
    ],
    culprit: 0, keyClue: 0,
    solution: "The handwriting match on the altered bid sheet, plus her unexplained absence from the check-in table, points directly at Denise wanting that vacation package for herself."
  },
  {
    title: "The Cracked Vault Code", place: "Aldermere Museum",
    brief: "A small but priceless ancient artifact disappeared from the museum's vault display during a private after-hours event.",
    suspects: [
      { name: "Guard Elias Frost", role: "Museum Guard", alibi: "Says he patrolled the vault room on his usual rounds.", motive: "None found — long tenure, no financial trouble on record." },
      { name: "Dr. Naomi Petrova", role: "Visiting Researcher", alibi: "Claims she was reviewing archives in a separate reading room.", motive: "Has a private collection and was denied permission to borrow the artifact for study." },
      { name: "Trustee Byron Ashcombe", role: "Museum Board Trustee", alibi: "Says he was mingling with donors the entire event.", motive: "None apparent — has funded the museum generously for years." }
    ],
    clues: [
      { label: "Vault Access Log", text: "The vault's access log shows Dr. Petrova's researcher badge was used to enter at 9:47 PM, well outside her approved reading room hours." },
      { label: "Travel Case", text: "Security later notes a gap in Dr. Petrova's travel case exactly the size and shape of the missing artifact." },
      { label: "Donor Photos", text: "Event photos place Byron consistently near the donor group throughout the entire evening, timestamps included." }
    ],
    culprit: 1, keyClue: 0,
    solution: "Dr. Petrova's badge accessing the vault outside her approved hours, combined with the suspiciously artifact-shaped gap in her travel case, makes the case against her clear."
  },
  {
    title: "Last Call", place: "Ember & Oak Restaurant",
    brief: "The head chef's secret sauce recipe leaked to a popular food blog just after a locked recipe binder went briefly missing.",
    suspects: [
      { name: "Sous Chef Yuki Tanaka", role: "Sous Chef", alibi: "Says the binder never left the kitchen on her watch.", motive: "Has been quietly planning to open a rival restaurant of her own." },
      { name: "Restaurant Critic Dana Foss", role: "Food Critic", alibi: "Claims she only ever dined there as a guest.", motive: "None found — reviewing the restaurant, not competing with it." },
      { name: "Rival Owner Theo Castillo", role: "Rival Restaurant Owner", alibi: "Says he's never been inside Ember & Oak.", motive: "Wants to replicate the restaurant's most popular dish." }
    ],
    clues: [
      { label: "Binder Lock", text: "The recipe binder's lock shows no signs of forced entry — only Yuki holds a key to it besides the head chef." },
      { label: "Blog Timing", text: "The food blog's post timing lines up exactly with Yuki's one day off that week." },
      { label: "Reservation Records", text: "Restaurant reservation records confirm Theo has never once booked a table at Ember & Oak." }
    ],
    culprit: 0, keyClue: 0,
    solution: "Only Yuki had a key besides the head chef, and the leak's timing matching her one day off all but confirms she passed the recipe along before opening her own place."
  }
];

// ==========================================================
// 2. EMBEDDED STYLES (Self-Contained)
// ==========================================================
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Special+Elite&family=Zilla+Slab:wght@400;500;700&family=Courier+Prime:wght@400;700&display=swap');

  .dc-root {
    --ink: #e9dfc7;
    --paper: #efe6cf;
    --paper-dark: #e2d5b3;
    --board: #1c1712;
    --board-2: #241d16;
    --rust: #a8452f;
    --rust-dark: #7c3223;
    --brass: #c9a24a;
    --shadow: #0c0a08;
    --stamp: #8f2d20;
    --muted: #7a6f5c;
    --green: #3a6a49;

    background:
      radial-gradient(ellipse at top left, #2a2118 0%, transparent 55%),
      radial-gradient(ellipse at bottom right, #241c14 0%, transparent 55%),
      var(--board);
    color: var(--ink);
    font-family: 'Zilla Slab', serif;
    min-height: 100vh;
    padding: 32px 18px 80px;
    box-sizing: border-box;
  }

  .dc-root *, .dc-root *::before, .dc-root *::after {
    box-sizing: border-box;
  }

  .dc-wrap {
    max-width: 960px;
    margin: 0 auto;
  }

  .dc-header {
    text-align: center;
    margin-bottom: 28px;
  }

  .dc-eyebrow {
    font-family: 'Courier Prime', monospace;
    letter-spacing: 0.35em;
    font-size: 12px;
    color: var(--brass);
    text-transform: uppercase;
    margin-bottom: 10px;
  }

  .dc-title {
    font-family: 'Special Elite', cursive;
    font-size: clamp(26px, 5vw, 42px);
    margin: 0 0 8px;
    color: var(--paper);
    text-shadow: 0 2px 0 var(--shadow);
    letter-spacing: 0.02em;
  }

  .dc-sub {
    font-family: 'Courier Prime', monospace;
    color: var(--muted);
    font-size: 13px;
  }

  .dc-tally {
    display: inline-block;
    margin-top: 14px;
    font-family: 'Courier Prime', monospace;
    font-size: 12px;
    letter-spacing: 0.08em;
    color: var(--board);
    background: var(--brass);
    padding: 5px 12px;
    border-radius: 2px;
    font-weight: 700;
  }

  .dc-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--brass), transparent);
    margin: 26px 0;
    opacity: 0.5;
  }

  .dc-case-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 14px;
  }

  .dc-case-tile {
    background: var(--board-2);
    border: 1px solid #3a2f22;
    border-radius: 3px;
    padding: 16px 14px;
    cursor: pointer;
    position: relative;
    transition: transform 0.15s ease, border-color 0.15s ease;
    text-align: left;
    display: block;
    width: 100%;
  }

  .dc-case-tile:hover {
    transform: translateY(-2px);
    border-color: var(--brass);
  }

  .dc-case-num {
    font-family: 'Courier Prime', monospace;
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 0.08em;
    margin-bottom: 8px;
  }

  .dc-case-title {
    font-family: 'Special Elite', cursive;
    font-size: 14px;
    color: var(--paper);
    line-height: 1.4;
  }

  .dc-case-tile.solved {
    border-color: var(--green);
  }

  .dc-case-tile.solved::after {
    content: "✓ SOLVED";
    position: absolute;
    top: 10px;
    right: 10px;
    font-family: 'Courier Prime', monospace;
    font-size: 9px;
    letter-spacing: 0.05em;
    color: var(--green);
    font-weight: 700;
  }

  .dc-back-btn {
    font-family: 'Courier Prime', monospace;
    background: none;
    border: 1px solid var(--muted);
    color: var(--ink);
    font-size: 12px;
    letter-spacing: 0.05em;
    padding: 8px 14px;
    border-radius: 2px;
    cursor: pointer;
    margin-bottom: 20px;
  }

  .dc-back-btn:hover {
    border-color: var(--brass);
    color: var(--brass);
  }

  .dc-brief {
    background: var(--paper);
    color: #2a2115;
    border-radius: 2px;
    padding: 22px 26px;
    box-shadow: 0 14px 30px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(0,0,0,0.06);
    position: relative;
    line-height: 1.65;
    font-size: 16px;
  }

  .dc-brief::before {
    content: "CONFIDENTIAL";
    position: absolute;
    top: 14px;
    right: 18px;
    font-family: 'Courier Prime', monospace;
    font-size: 11px;
    letter-spacing: 0.15em;
    color: var(--stamp);
    border: 2px solid var(--stamp);
    padding: 3px 8px;
    transform: rotate(6deg);
    opacity: 0.65;
    font-weight: 700;
  }

  .dc-brief h2 {
    font-family: 'Special Elite', cursive;
    font-size: 19px;
    margin: 0 0 12px;
  }

  .dc-case-tag {
    font-family: 'Courier Prime', monospace;
    color: var(--muted);
    font-size: 13px;
    margin-bottom: 6px;
  }

  .dc-block {
    margin-top: 34px;
  }

  .dc-block-title {
    font-family: 'Special Elite', cursive;
    font-size: 19px;
    color: var(--brass);
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .dc-tag {
    font-family: 'Courier Prime', monospace;
    font-size: 11px;
    color: var(--board);
    background: var(--brass);
    padding: 3px 8px;
    border-radius: 2px;
    letter-spacing: 0.08em;
  }

  .dc-suspects {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 14px;
  }

  .dc-suspect-card {
    background: var(--board-2);
    border: 1px solid #3a2f22;
    border-radius: 3px;
    padding: 14px;
    position: relative;
    overflow: hidden;
  }

  .dc-suspect-card::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--rust);
    opacity: 0.7;
  }

  .dc-suspect-name {
    font-family: 'Special Elite', cursive;
    font-size: 15px;
    color: var(--paper);
    margin-bottom: 8px;
  }

  .dc-suspect-line {
    font-size: 13px;
    color: #cfc3a6;
    margin: 4px 0;
    line-height: 1.5;
  }

  .dc-suspect-line b {
    color: var(--brass);
    font-weight: 600;
  }

  .dc-clues {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 14px;
  }

  .dc-clue-card {
    background: var(--paper-dark);
    color: #2a2115;
    border-radius: 2px;
    padding: 0;
    cursor: pointer;
    box-shadow: 0 8px 18px rgba(0,0,0,0.4);
    transform: rotate(var(--r, 0deg));
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    min-height: 110px;
    position: relative;
    border: none;
    text-align: left;
    display: block;
    width: 100%;
  }

  .dc-clue-card:nth-child(1) { --r: -1.5deg; }
  .dc-clue-card:nth-child(2) { --r: 1deg; }
  .dc-clue-card:nth-child(3) { --r: -0.5deg; }

  .dc-clue-card:hover {
    transform: rotate(0deg) translateY(-3px);
    box-shadow: 0 14px 24px rgba(0,0,0,0.5);
  }

  .dc-clue-card.revealed {
    background: var(--paper);
  }

  .dc-pin {
    position: absolute;
    top: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #e0503a, var(--rust-dark));
    box-shadow: 0 2px 4px rgba(0,0,0,0.5);
  }

  .dc-clue-inner {
    padding: 16px 14px 14px;
  }

  .dc-clue-label {
    font-family: 'Courier Prime', monospace;
    font-size: 11px;
    letter-spacing: 0.1em;
    color: var(--rust-dark);
    text-transform: uppercase;
    margin-bottom: 8px;
    font-weight: 700;
  }

  .dc-clue-front {
    font-family: 'Special Elite', cursive;
    font-size: 13px;
  }

  .dc-clue-back {
    font-size: 13px;
    line-height: 1.5;
  }

  .dc-accuse-box {
    background: var(--board-2);
    border: 1px solid #3a2f22;
    border-radius: 3px;
    padding: 22px;
  }

  .dc-field {
    margin-bottom: 16px;
  }

  .dc-field label {
    display: block;
    font-family: 'Courier Prime', monospace;
    font-size: 12px;
    letter-spacing: 0.08em;
    color: var(--brass);
    margin-bottom: 6px;
    text-transform: uppercase;
  }

  .dc-select {
    width: 100%;
    padding: 10px 12px;
    background: var(--paper);
    color: #2a2115;
    border: none;
    border-radius: 2px;
    font-family: 'Zilla Slab', serif;
    font-size: 15px;
  }

  .dc-btn-solve {
    font-family: 'Special Elite', cursive;
    font-size: 15px;
    letter-spacing: 0.03em;
    background: var(--rust);
    color: var(--paper);
    border: none;
    padding: 12px 22px;
    border-radius: 2px;
    cursor: pointer;
    box-shadow: 0 6px 14px rgba(0,0,0,0.4);
    transition: transform 0.15s ease, background 0.15s ease;
  }

  .dc-btn-solve:hover {
    background: var(--rust-dark);
    transform: translateY(-1px);
  }

  .dc-result {
    margin-top: 20px;
    padding: 18px 20px;
    border-radius: 2px;
    line-height: 1.6;
    font-size: 15px;
  }

  .dc-result.correct {
    background: #1c3324;
    border: 1px solid #3a6a49;
    color: #d7f0dd;
  }

  .dc-result.wrong {
    background: #3a1c1c;
    border: 1px solid #6a3a3a;
    color: #f0d7d7;
  }

  .dc-result h3 {
    font-family: 'Special Elite', cursive;
    margin: 0 0 8px;
    font-size: 17px;
  }

  .dc-result-actions {
    margin-top: 14px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .dc-result-actions button {
    font-family: 'Courier Prime', monospace;
    font-size: 12px;
    background: none;
    border: 1px solid var(--brass);
    color: var(--brass);
    padding: 8px 14px;
    border-radius: 2px;
    cursor: pointer;
  }

  .dc-result-actions button:hover {
    background: rgba(201,162,74,0.12);
  }

  .dc-footer {
    text-align: center;
    margin-top: 50px;
    font-family: 'Courier Prime', monospace;
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 0.08em;
  }
`;

// ==========================================================
// 3. REACT COMPONENT
// ==========================================================
export default function DetectiveCrimeGame({ onExit, onComplete }) {
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(null);
  const [solvedCases, setSolvedCases] = useState(() => new Set());
  const [revealedClues, setRevealedClues] = useState({});
  const [suspectChoice, setSuspectChoice] = useState('0');
  const [clueChoice, setClueChoice] = useState('0');
  const [resultStatus, setResultStatus] = useState(null);

  const resultRef = useRef(null);
  const completionSentRef = useRef(false);
  const currentCase = selectedCaseIdx !== null ? CASES[selectedCaseIdx] : null;

  const handleOpenCase = (index) => {
    setSelectedCaseIdx(index);
    setRevealedClues({});
    setSuspectChoice('0');
    setClueChoice('0');
    setResultStatus(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToList = () => {
    setSelectedCaseIdx(null);
    setResultStatus(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleClue = (clueIdx) => {
    setRevealedClues(prev => ({
      ...prev,
      [clueIdx]: !prev[clueIdx]
    }));
  };

  const handleCloseCase = (e) => {
    e.preventDefault();
    if (!currentCase) return;

    const chosenSuspect = parseInt(suspectChoice, 10);
    const chosenClue = parseInt(clueChoice, 10);

    const isCorrect = chosenSuspect === currentCase.culprit && chosenClue === currentCase.keyClue;
    const isRightSuspect = chosenSuspect === currentCase.culprit;
    const guiltyName = currentCase.suspects[currentCase.culprit].name;

    if (isCorrect) {
      if (!completionSentRef.current) {
        completionSentRef.current = true;
        onComplete?.({ official: true, solved: true, caseIndex: selectedCaseIdx });
      }
      setSolvedCases(prev => new Set(prev).add(selectedCaseIdx));
      setResultStatus({
        type: 'correct',
        title: 'Case Closed',
        message: `Correct. ${guiltyName} did it. ${currentCase.solution}`
      });
    } else {
      const hint = isRightSuspect
        ? "You've got the right suspect — but not the evidence that proves it."
        : "Not quite the right suspect.";
      setResultStatus({
        type: 'wrong',
        title: 'Not Quite',
        message: `${hint} The real culprit was ${guiltyName}. ${currentCase.solution}`
      });
    }

    setTimeout(() => {
      if (resultRef.current) {
        resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };

  const handleNextCase = () => {
    const nextIdx = (selectedCaseIdx + 1) % CASES.length;
    handleOpenCase(nextIdx);
  };

  return (
    <div className="dc-root">
      <style>{STYLES}</style>
      <div className="dc-wrap">
        {/* Header */}
        <header className="dc-header">
          <div className="dc-eyebrow">Confidential &middot; Investigator's Copy</div>
          <h1 className="dc-title">Detective: Crime</h1>
          <div className="dc-sub">
            25 case files. Pick one, read the brief, examine the evidence, name the culprit.
          </div>
          <div className="dc-tally">
            {solvedCases.size} / {CASES.length} Solved
          </div>
        </header>

        <div className="dc-divider" />

        {/* LIST VIEW */}
        {selectedCaseIdx === null ? (
          <div>
            {onExit && (
              <div style={{ marginBottom: '16px' }}>
                <button type="button" className="dc-back-btn" onClick={onExit}>
                  &larr; Exit to Hub
                </button>
              </div>
            )}
            <div className="dc-case-grid">
              {CASES.map((c, idx) => (
                <button
                  key={c.title + idx}
                  type="button"
                  className={`dc-case-tile ${solvedCases.has(idx) ? 'solved' : ''}`}
                  onClick={() => handleOpenCase(idx)}
                >
                  <div className="dc-case-num">CASE {String(idx + 1).padStart(3, '0')}</div>
                  <div className="dc-case-title">{c.title}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* DETAIL VIEW */
          <div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" className="dc-back-btn" onClick={handleBackToList}>
                &larr; Back to Case Files
              </button>
              {onExit && (
                <button type="button" className="dc-back-btn" onClick={onExit}>
                  Exit to Hub
                </button>
              )}
            </div>

            <div className="dc-case-tag">
              CASE NO. {String(selectedCaseIdx + 1).padStart(3, '0')} — {currentCase.place.toUpperCase()}
            </div>

            <div className="dc-brief">
              <h2>{currentCase.title}</h2>
              <p>{currentCase.brief}</p>
            </div>

            {/* Suspects */}
            <section className="dc-block">
              <div className="dc-block-title">
                Suspects <span className="dc-tag">03</span>
              </div>
              <div className="dc-suspects">
                {currentCase.suspects.map((s, idx) => (
                  <div key={s.name + idx} className="dc-suspect-card">
                    <div className="dc-suspect-name">{s.name}</div>
                    <div className="dc-suspect-line"><b>Role:</b> {s.role}</div>
                    <div className="dc-suspect-line"><b>Alibi:</b> {s.alibi}</div>
                    <div className="dc-suspect-line"><b>Motive:</b> {s.motive}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Evidence Clues */}
            <section className="dc-block">
              <div className="dc-block-title">
                Evidence Board <span className="dc-tag">TAP TO REVEAL</span>
              </div>
              <div className="dc-clues">
                {currentCase.clues.map((cl, idx) => {
                  const isRevealed = !!revealedClues[idx];
                  return (
                    <button
                      key={cl.label + idx}
                      type="button"
                      className={`dc-clue-card ${isRevealed ? 'revealed' : ''}`}
                      onClick={() => toggleClue(idx)}
                      tabIndex={0}
                    >
                      <span className="dc-pin" />
                      <div className="dc-clue-inner">
                        <div className="dc-clue-label">{cl.label}</div>
                        {!isRevealed ? (
                          <div className="dc-clue-front">Tap to examine</div>
                        ) : (
                          <div className="dc-clue-back">{cl.text}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Accuse */}
            <section className="dc-block">
              <div className="dc-block-title">Name The Culprit</div>
              <div className="dc-accuse-box">
                <form onSubmit={handleCloseCase}>
                  <div className="dc-field">
                    <label htmlFor="dc-suspect-select">Who did it?</label>
                    <select
                      id="dc-suspect-select"
                      className="dc-select"
                      value={suspectChoice}
                      onChange={(e) => setSuspectChoice(e.target.value)}
                    >
                      {currentCase.suspects.map((s, i) => (
                        <option key={s.name} value={i}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="dc-field">
                    <label htmlFor="dc-clue-select">What gave them away?</label>
                    <select
                      id="dc-clue-select"
                      className="dc-select"
                      value={clueChoice}
                      onChange={(e) => setClueChoice(e.target.value)}
                    >
                      {currentCase.clues.map((cl, i) => (
                        <option key={cl.label} value={i}>{cl.label}</option>
                      ))}
                    </select>
                  </div>

                  <button type="submit" className="dc-btn-solve">
                    Close The Case
                  </button>
                </form>

                {resultStatus && (
                  <div ref={resultRef} className={`dc-result ${resultStatus.type}`}>
                    <h3>{resultStatus.title}</h3>
                    <p>{resultStatus.message}</p>
                    <div className="dc-result-actions">
                      <button type="button" onClick={handleNextCase}>Next Case &rarr;</button>
                      <button type="button" onClick={handleBackToList}>Back to Case Files</button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        <footer className="dc-footer">DETECTIVE &middot; CRIME &mdash; A CLUB MYSTERY</footer>
      </div>
    </div>
  );
}
