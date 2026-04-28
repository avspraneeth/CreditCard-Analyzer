// cc-data.js — Card data, state variables, and all UI logic for CC Analyzer
// Updated April 2026: Axis Atlas partner list corrected post devaluation

// ── Transfer ratio overrides per card (where it's NOT 1:2) ───────────────────
// For most cards: 1 card point → 2 partner miles/points (ratio=2)
// Exceptions stored here: key = cardId + '|' + partnerName
var TRANSFER_RATIOS = {
  // Axis Atlas new Apr 2026 partners: 2:1 (2 EDGE Miles = 1 mile)
  'axis_atlas|British Airways (Avios)':       0.5,
  'axis_atlas|Finnair Plus':                  0.5,
  'axis_atlas|Vietnam Airlines (Lotusmiles)': 0.5,
  // Axis Atlas hotel partners: 1:1
  'axis_atlas|Orchid Rewards':                1.0,
  'axis_atlas|Radisson Rewards':              1.0,
  // Amex Platinum Reserve: airline transfers at 2:1 (2 MR = 1 mile)
  'amex_plat_reserve|British Airways (Avios)':        0.5,
  'amex_plat_reserve|Emirates Skywards':              0.5,
  'amex_plat_reserve|Etihad Guest':                   0.5,
  'amex_plat_reserve|Qatar Privilege Club':           0.5,
  'amex_plat_reserve|Singapore Airlines (KrisFlyer)': 0.5,
  'amex_plat_reserve|Virgin Atlantic Flying Club':    0.5,
  'amex_plat_reserve|Asia Miles (Cathay)':            0.5,
};

function transferRatio(cardId, partnerName) {
  var key = cardId + '|' + partnerName;
  if (TRANSFER_RATIOS[key] !== undefined) return TRANSFER_RATIOS[key];
  // Default: axis_atlas legacy partners = 1:2 (1 EDGE Mile → 2 airline miles)
  if (cardId === 'axis_atlas') return 2;
  return 1;
}
// ── Partner canonical aliases ─────────────────────────────────────────────────
var PARTNER_ALIASES = {
  'Air India (via Neu)':            'Air India (Maharaja Club)',
  'Etihad Airways':                 'Etihad Guest',
  'Etihad Partner Airlines':        'Etihad Guest',
  'Etihad Partner Airways':         'Etihad Guest',
  'Qatar Airways (Privilege Club)': 'Qatar Privilege Club',
  'Qatar Airways':                  'Qatar Privilege Club',
  'IHG Rewards':                    'IHG One Rewards',
  // Marriott-family brands all map to Marriott Bonvoy
  'Marriott':                       'Marriott Bonvoy',
  'Marriott Hotels':                'Marriott Bonvoy',
  'Marriott Rewards':               'Marriott Bonvoy',
  'Bonvoy':                         'Marriott Bonvoy',
  'Sheraton':                       'Marriott Bonvoy',
  'Westin':                         'Marriott Bonvoy',
  'W Hotels':                       'Marriott Bonvoy',
  'St. Regis':                      'Marriott Bonvoy',
  'Ritz-Carlton':                   'Marriott Bonvoy',
  'The Ritz-Carlton':               'Marriott Bonvoy',
  'JW Marriott':                    'Marriott Bonvoy',
  'Autograph Collection':           'Marriott Bonvoy',
  'Renaissance Hotels':             'Marriott Bonvoy',
  'Courtyard':                      'Marriott Bonvoy',
  'Courtyard by Marriott':          'Marriott Bonvoy',
  'Four Points by Sheraton':        'Marriott Bonvoy',
  'Four Points':                    'Marriott Bonvoy',
  'Le Meridien':                    'Marriott Bonvoy',
  'Le Méridien':                    'Marriott Bonvoy',
  'The Luxury Collection':          'Marriott Bonvoy',
  'Luxury Collection':              'Marriott Bonvoy',
  'Delta Hotels':                   'Marriott Bonvoy',
  'Tribute Portfolio':              'Marriott Bonvoy',
  'Design Hotels':                  'Marriott Bonvoy',
  'Moxy Hotels':                    'Marriott Bonvoy',
  'Fairfield':                      'Marriott Bonvoy',
};
function canonical(name) { return PARTNER_ALIASES[name] || name; }

var ALLIANCE = {
  'Aer Lingus AerClub':'oneworld','Air Canada Aeroplan':'Star Alliance',
  'Air France KLM (Flying Blue)':'SkyTeam','Air India (Maharaja Club)':'Star Alliance',
  'Asia Miles (Cathay)':'oneworld','British Airways (Avios)':'oneworld',
  'Emirates Skywards':'Gulf','Etihad Guest':'Gulf','Ethiopian ShebaMiles':'Star Alliance',
  'Finnair Plus':'oneworld','Iberia Plus':'oneworld','JAL Mileage Bank':'oneworld',
  'Lufthansa Miles&More':'Star Alliance','Qatar Privilege Club':'oneworld',
  'SAS EuroBonus':'Star Alliance','Singapore Airlines (KrisFlyer)':'Star Alliance',
  'SpiceJet SpiceClub':'Independent','Turkish Airlines (Miles&Smiles)':'Star Alliance',
  'United MileagePlus':'Star Alliance','Vietnam Airlines (Lotusmiles)':'Star Alliance',
  'Virgin Atlantic Flying Club':'Independent',
};



// Static milestone/fee data for builtin cards — always available synchronously.
// Keyed by names array (same matching logic as findBuiltin).
var BUILTIN_CARD_INFO = [
  {names:["IndusInd Avios Infinite","IndusInd Avios","IndusInd Bank Avios Infinite"],
   milestoneBonus:[{threshold:800000,bonusPts:18000,label:"18,000 bonus Avios at Rs.8L annual spend"}],
   annualFee:11800,feeNote:"Rs.10,000 + 18% GST; waived at Rs.10L spend",renewalBenefits:[]},
  {names:["BOBCard Etihad Guest Premier","BobCard Etihad Guest Premier","Bank of Baroda Etihad Guest Premier","BOB Etihad Guest Premier","BOB Etihad"],
   milestoneBonus:[],
   annualFee:5899,feeNote:"Rs.4,999 + 18% GST",
   renewalBenefits:[{bonusPts:5000,partner:"Etihad Guest",label:"5,000 Etihad miles on card anniversary"}]},
  {names:["ICICI Emirates Emeralde","ICICI Emirates","Emirates Emeralde","ICICI Bank Emirates Emeralde"],
   milestoneBonus:[],
   annualFee:11800,feeNote:"Rs.10,000 + 18% GST",
   renewalBenefits:[{bonusPts:5000,partner:"Emirates Skywards",label:"5,000 Emirates Skywards miles on card anniversary"}]},
  {names:["ICICI Times Black","Times Black","ICICI Bank Times Black"],
   milestoneBonus:[
     {threshold:200000,bonusValue:10000,label:"₹10,000 Klook voucher at Rs.2L spend"},
     {threshold:500000,bonusValue:10000,label:"₹10,000 airport transfer voucher at Rs.5L spend"},
     {threshold:1000000,bonusValue:10000,label:"₹10,000 Tata CLiQ Luxury gift card at Rs.10L spend"},
     {threshold:2000000,bonusValue:20000,label:"₹20,000 Ayatana/Lohono luxury stay at Rs.20L spend"}
   ],
   annualFee:11800,feeNote:"Rs.10,000 + 18% GST",renewalBenefits:[]},
  {names:["American Express Platinum Travel","Amex Platinum Travel","Amex Plat Travel","AmEx Platinum Travel"],
   milestoneBonus:[
     {threshold:190000,bonusPts:7500,label:"7,500 bonus MR at Rs.1.9L spend"},
     {threshold:400000,bonusPts:10000,label:"10,000 bonus MR at Rs.4L spend"},
     {threshold:700000,bonusPts:22500,bonusValue:10000,label:"22,500 bonus MR + ₹10,000 Taj voucher at Rs.7L spend"}
   ],
   annualFee:4130,feeNote:"Rs.3,500 + 18% GST",renewalBenefits:[]},
  {names:["American Express Platinum Reserve","Amex Platinum Reserve","Amex Plat Reserve","AmEx Platinum Reserve"],
   milestoneBonus:[],
   annualFee:11800,feeNote:"Rs.10,000 + 18% GST",renewalBenefits:[]},
  {names:["Axis Atlas","Axis Bank Atlas","Axis Atlas Credit Card"],
   milestoneBonus:[
     {threshold:300000,bonusPts:2500,label:"2,500 bonus EDGE miles at Rs.3L spend"},
     {threshold:750000,bonusPts:5000,label:"5,000 bonus EDGE miles + Gold tier at Rs.7.5L spend"},
     {threshold:1500000,bonusPts:10000,label:"10,000 bonus EDGE miles + Platinum tier at Rs.15L spend"}
   ],
   annualFee:5900,feeNote:"Rs.5,000 + 18% GST; waived at Rs.7.5L spend",renewalBenefits:[]},
  {names:["Axis Vistara Infinite","Axis Vistara","Axis Bank Vistara Infinite","Axis Bank Vistara"],
   milestoneBonus:[
     {threshold:100000,bonusPts:10000,label:"10,000 bonus CV Points at Rs.1L spend"},
     {threshold:250000,bonusValue:20000,label:"Business Class ticket voucher at Rs.2.5L spend"},
     {threshold:500000,bonusValue:20000,label:"Business Class ticket voucher at Rs.5L spend"},
     {threshold:750000,bonusValue:20000,label:"Business Class ticket voucher at Rs.7.5L spend"},
     {threshold:1200000,bonusValue:20000,label:"Business Class ticket voucher at Rs.12L spend"}
   ],
   annualFee:11800,feeNote:"Rs.10,000 + 18% GST; waived at Rs.12L spend",renewalBenefits:[]},
  {names:["HSBC TravelOne","HSBC Travel One","HSBC TravelOne Credit Card"],
   milestoneBonus:[{threshold:1200000,bonusPts:10000,label:"10,000 bonus points at Rs.12L annual spend"}],
   annualFee:5899,feeNote:"Rs.4,999 + 18% GST; waived at Rs.8L spend",renewalBenefits:[]},
  {names:["HSBC Premier","HSBC Premier Mastercard","HSBC Premier Credit Card"],
   milestoneBonus:[],
   annualFee:0,feeNote:"Complimentary for HSBC Premier banking customers",renewalBenefits:[]},
  {names:["HDFC Marriott Bonvoy","HDFC Marriott","HDFC Bank Marriott Bonvoy"],
   milestoneBonus:[
     {threshold:600000,bonusValue:8000,label:"1 Free Night Award at Rs.6L spend"},
     {threshold:900000,bonusValue:8000,label:"2nd Free Night Award at Rs.9L spend"},
     {threshold:1500000,bonusValue:16000,label:"3rd + 4th Free Night Awards at Rs.15L spend"}
   ],
   annualFee:3540,feeNote:"Rs.3,000 + 18% GST",renewalBenefits:[]},
  {names:["HDFC Tata Neu Infinity","HDFC Tata Neu","Tata Neu Infinity","Tata Neu Infinity HDFC"],
   milestoneBonus:[],
   annualFee:1769,feeNote:"Rs.1,499 + 18% GST; waived at Rs.3L spend",renewalBenefits:[]},
  {names:["ICICI MakeMyTrip","ICICI MMT","MakeMyTrip ICICI","ICICI Bank MakeMyTrip"],
   milestoneBonus:[],
   annualFee:1179,feeNote:"Rs.999 + 18% GST",renewalBenefits:[]}
];

function patchCardsFromBuiltins() {
  if (!cards.length) return;
  cards.forEach(function(card) {
    var n = card.name.toLowerCase().trim();
    var match = BUILTIN_CARD_INFO.find(function(b) {
      return b.names.some(function(bn) {
        var bl = bn.toLowerCase();
        return bl === n || (bl.length >= 7 && n.includes(bl)) || (n.length >= 7 && bl.includes(n));
      });
    });
    if (!match) return;
    if (Array.isArray(match.milestoneBonus))
      card.milestoneBonus = JSON.parse(JSON.stringify(match.milestoneBonus));
    if (typeof match.annualFee === 'number') card.annualFee = match.annualFee;
    if (match.feeNote) card.feeNote = match.feeNote;
    if (Array.isArray(match.renewalBenefits))
      card.renewalBenefits = JSON.parse(JSON.stringify(match.renewalBenefits));
  });
}

// Returns milestoneBonus array for a card — uses card's own data if set,
// otherwise falls back to BUILTIN_CARD_INFO by name match.
// This ensures milestones are always evaluated even on stale/unpatched card objects.
function getEffectiveMilestones(card) {
  if (card.milestoneBonus && card.milestoneBonus.length) return card.milestoneBonus;
  var n = card.name.toLowerCase().trim();
  var match = BUILTIN_CARD_INFO.find(function(b) {
    return b.names.some(function(bn) {
      var bl = bn.toLowerCase();
      return bl === n || (bl.length >= 7 && n.includes(bl)) || (n.length >= 7 && bl.includes(n));
    });
  });
  return (match && Array.isArray(match.milestoneBonus)) ? match.milestoneBonus : [];
}

var DC = [];
var _LEGACY_DC = [
  {id:'axis_vistara',name:'Axis Vistara Infinite',currency:'CV Points / Air India Miles',baseRate:6/200,forexMarkup:0.035,intlRate:0.03,intlTravelRate:0.03,
   categories:{'Flights':6/200,'Hotels':6/200,'Dining':6/200,'Shopping':6/200,'Groceries':6/200,'Entertainment':6/200,'Healthcare':6/200,'Education':6/200,'Utilities':0,'Insurance':0,'Fuel':0,'Rent':0,'Government':0,'Jewellery':0,'Wallet Loads':0,'International Transactions':0.03},
   exclusions:['Utilities','Insurance','Fuel','Rent','Government','Jewellery','Wallet Loads'],dex:['Utilities','Insurance','Fuel','Rent','Government','Jewellery','Wallet Loads'],
   partners:[{name:'Air India (Maharaja Club)',type:'airline'}],
   notes:'Discontinued for new applications post Vistara-Air India merger. 6 CV pts per Rs.200. 1 CV pt = 1 Air India Maharaja Club mile.',
   milestones:'Rs.1L->10K bonus pts; Rs.2.5/5/7.5/12L -> Business Class ticket vouchers'},

  {id:'axis_atlas',name:'Axis Atlas',currency:'EDGE Miles',baseRate:2/100,forexMarkup:0.035,intlRate:0.02,intlTravelRate:0.05,
   categories:{'Flights':5/100,'Hotels':5/100,'Dining':2/100,'Shopping':2/100,'Groceries':2/100,'Entertainment':2/100,'Healthcare':2/100,'Education':2/100,'Utilities':0,'Insurance':0,'Fuel':0,'Rent':0,'Government':0,'Jewellery':0,'Wallet Loads':0,'International Transactions':0.02},
   exclusions:['Utilities','Insurance','Fuel','Rent','Government','Jewellery','Wallet Loads'],dex:['Utilities','Insurance','Fuel','Rent','Government','Jewellery','Wallet Loads'],
   partners:[
     // Group A (30K/yr cap) — legacy 1:2 ratio (1 EDGE Mile = 2 miles)
     {name:'Singapore Airlines (KrisFlyer)',type:'airline'},
     {name:'Air Canada Aeroplan',type:'airline'},
     {name:'JAL Mileage Bank',type:'airline'},
     // Group A new Apr 2026 — 2:1 ratio (2 EDGE Miles = 1 mile)
     {name:'British Airways (Avios)',type:'airline'},
     {name:'Finnair Plus',type:'airline'},
     {name:'Vietnam Airlines (Lotusmiles)',type:'airline'},
     // Group B (120K/yr cap) — legacy 1:2 ratio
     {name:'Air France KLM (Flying Blue)',type:'airline'},
     {name:'Air India (Maharaja Club)',type:'airline'},
     {name:'United MileagePlus',type:'airline'},
     {name:'Turkish Airlines (Miles&Smiles)',type:'airline'},
     {name:'Ethiopian ShebaMiles',type:'airline'},
     {name:'SpiceJet SpiceClub',type:'airline'},
     {name:'ITC Hotels',type:'hotel'},
     {name:'IHG One Rewards',type:'hotel'},
     // New hotel partners (1:1 ratio)
     {name:'Orchid Rewards',type:'hotel'},
     {name:'Radisson Rewards',type:'hotel'},
   ],
   notes:'APRIL 2026 UPDATE: Accor, Marriott Bonvoy, and Qatar Airways REMOVED. Legacy partners (KrisFlyer, Aeroplan, JAL, Air India, Flying Blue etc.) at 1:2 (1 EDGE Mile = 2 miles). New Apr 2026 partners (BA, Finnair, Vietnam) at 2:1 (poor ratio). Group A cap 30K/yr, Group B cap 120K/yr. 5X travel capped Rs.2L/month.',
   milestones:'Rs.3L->2.5K EDGE miles; Rs.7.5L->5K EDGE miles + Gold tier; Rs.15L->10K EDGE miles + Platinum tier'},

  {id:'indusind_avios',name:'IndusInd Avios Infinite',currency:'Avios',baseRate:3/200,forexMarkup:0.035,intlRate:0.015,intlTravelRate:0.015,
   categories:{'Flights':5/200,'Hotels':3/200,'Dining':3/200,'Shopping':3/200,'Groceries':3/200,'Entertainment':3/200,'Healthcare':3/200,'Education':1/200,'Utilities':1/200,'Insurance':1/200,'Fuel':0,'Rent':3/200,'Government':1/200,'Jewellery':3/200,'Wallet Loads':3/200,'International Transactions':0.015},
   exclusions:['Fuel'],dex:['Fuel'],
   partners:[{name:'British Airways (Avios)',type:'airline'},{name:'Qatar Privilege Club',type:'airline'},{name:'Iberia Plus',type:'airline'},{name:'Aer Lingus AerClub',type:'airline'}],
   notes:'Avios shared by BA and Qatar at 1:1. POS at preferred destination earns 6 Avios/Rs.200. 1.5% reduced forex on preferred destination.',
   milestones:'Rs.8L spend -> 18K-25K bonus Avios'},

  {id:'bob_etihad',name:'BOBCard Etihad Guest Premier',currency:'Etihad Guest Miles',baseRate:2/100,forexMarkup:0.0,intlRate:0.02,intlTravelRate:0.02,
   categories:{'Flights':6/100,'Hotels':2/100,'Dining':0,'Shopping':0,'Groceries':0,'Entertainment':2/100,'Healthcare':0,'Education':0,'Utilities':2/100,'Insurance':0,'Fuel':0,'Rent':0,'Government':0,'Jewellery':2/100,'Wallet Loads':0,'International Transactions':0.02},
   exclusions:['Dining','Shopping','Groceries','Healthcare','Education','Insurance','Fuel','Rent','Government','Wallet Loads'],dex:['Dining','Shopping','Groceries','Healthcare','Education','Insurance','Fuel','Rent','Government','Wallet Loads'],
   partners:[{name:'Etihad Guest',type:'airline'}],
   notes:'0% forex markup. 6 miles/Rs.100 on etihad.com (direct bookings only). 2 miles/Rs.100 on all other spends. Many lifestyle categories excluded.',
   milestones:'Monthly/quarterly/annual milestone bonus miles; Silver tier on first Etihad.com txn'},

  {id:'icici_emirates',name:'ICICI Emirates Emeralde',currency:'Emirates Skywards Miles',baseRate:2/100,forexMarkup:0.035,intlRate:0.02,intlTravelRate:0.02,
   categories:{'Flights':2.5/100,'Hotels':2/100,'Dining':2/100,'Shopping':2/100,'Groceries':2/100,'Entertainment':2/100,'Healthcare':2/100,'Education':2/100,'Utilities':1/100,'Insurance':1/100,'Fuel':0,'Rent':2/100,'Government':1/100,'Jewellery':2/100,'Wallet Loads':2/100,'International Transactions':0.02},
   exclusions:['Fuel'],dex:['Fuel'],
   partners:[{name:'Emirates Skywards',type:'airline'}],
   notes:'2 miles/Rs.100 general; 2.5 miles on Emirates direct. Silver Tier on activation; Gold on Rs.15L spend (incl. Rs.50K on Emirates.com). 3.5% forex markup.',
   milestones:'Rs.15L + Rs.50K on Emirates.com -> Gold Tier Membership'},

  {id:'icici_times_black',name:'ICICI Times Black',currency:'ICICI Reward Points',baseRate:2/100,forexMarkup:0.0149,intlRate:0.025,intlTravelRate:0.025,
   categories:{'Flights':12/100,'Hotels':24/100,'Dining':2/100,'Shopping':2/100,'Groceries':2/100,'Entertainment':2/100,'Healthcare':2/100,'Education':2/100,'Utilities':2/100,'Insurance':2/100,'Fuel':2/100,'Rent':0,'Government':2/100,'Jewellery':2/100,'Wallet Loads':0,'International Transactions':0.025},
   exclusions:['Rent','Wallet Loads'],dex:['Rent','Wallet Loads'],
   partners:[{name:'Air India (Maharaja Club)',type:'airline'}],
   notes:'2.5 pts/Rs.100 on international spends. 12X on iShop hotels, 6X on iShop flights/vouchers. 1.49% forex. 5K pts/month cap on utilities/insurance/edu/govt combined. Fuel earns pts but no redemption.',
   milestones:'Rs.2L->Rs.10K Klook; Rs.5L->Rs.10K airport transfers; Rs.10L->Rs.10K Tata CLiQ Luxury; Rs.20L->Rs.20K Ayatana/Lohono stay; Rs.25L->fee waiver'},

  {id:'hdfc_tata_neu',name:'HDFC Tata Neu Infinity',currency:'NeuCoins',baseRate:1.5/100,forexMarkup:0.035,intlRate:0.015,intlTravelRate:0.015,
   categories:{'Flights':5/100,'Hotels':5/100,'Dining':5/100,'Shopping':5/100,'Groceries':5/100,'Entertainment':1.5/100,'Healthcare':5/100,'Education':1.5/100,'Utilities':1.5/100,'Insurance':1.5/100,'Fuel':0,'Rent':0,'Government':0,'Jewellery':1.5/100,'Wallet Loads':0,'International Transactions':0.015},
   exclusions:['Fuel','Rent','Government','Wallet Loads'],dex:['Fuel','Rent','Government','Wallet Loads'],
   partners:[{name:'IHCL / Taj Hotels',type:'hotel'}],
   notes:'1 NeuCoin = Rs.1 on Tata Neu. 5% on Tata brands requires NeuPass subscription. Grocery/utility/insurance each capped 2000 NeuCoins/month. NeuCoins expire 12 months from credit. UPI earn on RuPay variant. NeuCoins cannot be transferred to Air India.',
   milestones:'NeuPass needed for 5% on Tata brands. Lounge access milestone-based from Jun 2025.'},

  {id:'hdfc_marriott',name:'HDFC Marriott Bonvoy',currency:'Marriott Bonvoy Points',baseRate:2/150,forexMarkup:0.035,intlRate:0.013333333333333334,intlTravelRate:0.013333333333333334,
   categories:{'Flights':4/150,'Hotels':8/150,'Dining':4/150,'Shopping':2/150,'Groceries':2/150,'Entertainment':4/150,'Healthcare':2/150,'Education':2/150,'Utilities':2/150,'Insurance':2/150,'Fuel':0,'Rent':2/150,'Government':2/150,'Jewellery':2/150,'Wallet Loads':0,'International Transactions':0.013333333333333334},
   exclusions:['Fuel','Wallet Loads'],dex:['Fuel','Wallet Loads'],
   partners:[{name:'Marriott Bonvoy',type:'hotel'}],
   notes:'8 pts/Rs.150 at Marriott properties; 4 pts on travel/dining/entertainment; 2 pts elsewhere. Diners Club network. Airline transfers at 3:1 (3 Bonvoy pts = 1 airline mile).',
   milestones:'Rs.6L->1 Free Night (15K pts); Rs.9L->2nd; Rs.15L->3rd and 4th Free Night Award'},

  {id:'amex_plat_travel',name:'Amex Platinum Travel',currency:'Membership Rewards (MR)',baseRate:1/50,forexMarkup:0.035,intlRate:0.02,intlTravelRate:0.02,
   categories:{'Flights':1/50,'Hotels':1/50,'Dining':1/50,'Shopping':1/50,'Groceries':1/50,'Entertainment':1/50,'Healthcare':1/50,'Education':1/50,'Utilities':0,'Insurance':0,'Fuel':0,'Rent':1/50,'Government':1/50,'Jewellery':1/50,'Wallet Loads':1/50,'International Transactions':0.02},
   exclusions:['Utilities','Insurance','Fuel'],dex:['Utilities','Insurance','Fuel'],
   partners:[{name:'British Airways (Avios)',type:'airline'},{name:'Qatar Privilege Club',type:'airline'},{name:'Singapore Airlines (KrisFlyer)',type:'airline'},{name:'Emirates Skywards',type:'airline'},{name:'Virgin Atlantic Flying Club',type:'airline'},{name:'Air France KLM (Flying Blue)',type:'airline'},{name:'Asia Miles (Cathay)',type:'airline'},{name:'Finnair Plus',type:'airline'},{name:'Marriott Bonvoy',type:'hotel'},{name:'Hilton Honors',type:'hotel'},{name:'Taj Hotels Voucher',type:'hotel'}],
   notes:'1 MR per Rs.50 on eligible spends. All partners at 1:1 MR to miles. Milestone-focused card.',
   milestones:'Rs.1.9L->7.5K MR; Rs.4L->10K MR; Rs.7L->22.5K MR + Rs.10K Taj voucher'},

  {id:'hsbc_premier',name:'HSBC Premier',currency:'HSBC Reward Points',baseRate:3/100,forexMarkup:0.0099,intlRate:0.03,intlTravelRate:0.03,
   categories:{'Flights':18/100,'Hotels':36/100,'Dining':3/100,'Shopping':3/100,'Groceries':3/100,'Entertainment':3/100,'Healthcare':3/100,'Education':0,'Utilities':3/100,'Insurance':3/100,'Fuel':0,'Rent':3/100,'Government':3/100,'Jewellery':0,'Wallet Loads':0,'International Transactions':0.03},
   exclusions:['Fuel','Jewellery','Wallet Loads','Education'],dex:['Fuel','Jewellery','Wallet Loads','Education'],
   partners:[{name:'Singapore Airlines (KrisFlyer)',type:'airline'},{name:'British Airways (Avios)',type:'airline'},{name:'Air India (Maharaja Club)',type:'airline'},{name:'Emirates Skywards',type:'airline'},{name:'Etihad Guest',type:'airline'},{name:'Qatar Privilege Club',type:'airline'},{name:'United MileagePlus',type:'airline'},{name:'Turkish Airlines (Miles&Smiles)',type:'airline'},{name:'Lufthansa Miles&More',type:'airline'},{name:'Air France KLM (Flying Blue)',type:'airline'},{name:'Vietnam Airlines (Lotusmiles)',type:'airline'},{name:'JAL Mileage Bank',type:'airline'},{name:'SAS EuroBonus',type:'airline'},{name:'Accor Live Limitless',type:'hotel'},{name:'Marriott Bonvoy',type:'hotel'},{name:'IHG One Rewards',type:'hotel'},{name:'Hilton Honors',type:'hotel'}],
   notes:'0.99% forex markup. 3 pts/Rs.100 on virtually all categories. 20+ partners at 1:1. Points never expire. Exclusive to HSBC Premier banking customers. Utility/insurance/edu/govt capped at Rs.1L combined/month.',
   milestones:'Up to 12X via HSBC Travel with Points portal. No traditional milestone structure.'},
  // ── HSBC TravelOne ───────────────────────────────────────────────────────────
  {id:'hsbc_travelone',name:'HSBC TravelOne',currency:'HSBC Reward Points',baseRate:2/100,forexMarkup:0.035,intlRate:0.04,intlTravelRate:0.04,
   categories:{'Flights':8/100,'Hotels':12/100,'Dining':2/100,'Shopping':2/100,'Groceries':2/100,'Entertainment':2/100,'Healthcare':2/100,'Education':0,'Utilities':0,'Insurance':0,'Fuel':0,'Rent':0,'Government':0,'Jewellery':0,'Wallet Loads':0,'International Transactions':0.04},
   exclusions:['Education','Utilities','Insurance','Fuel','Rent','Government','Jewellery','Wallet Loads'],dex:['Education','Utilities','Insurance','Fuel','Rent','Government','Jewellery','Wallet Loads'],
   partners:[
     {name:'Singapore Airlines (KrisFlyer)',type:'airline'},{name:'Air India (Maharaja Club)',type:'airline'},
     {name:'British Airways (Avios)',type:'airline'},{name:'Qatar Privilege Club',type:'airline'},
     {name:'Air France KLM (Flying Blue)',type:'airline'},{name:'Etihad Guest',type:'airline'},
     {name:'United MileagePlus',type:'airline'},{name:'Turkish Airlines (Miles&Smiles)',type:'airline'},
     {name:'Vietnam Airlines (Lotusmiles)',type:'airline'},{name:'JAL Mileage Bank',type:'airline'},
     {name:'SAS EuroBonus',type:'airline'},{name:'Lufthansa Miles&More',type:'airline'},
     {name:'Accor Live Limitless',type:'hotel'},{name:'Marriott Bonvoy',type:'hotel'},
     {name:'IHG One Rewards',type:'hotel'},{name:'Hilton Honors',type:'hotel'},
   ],
   notes:'Rewards Marketplace portal: 6X hotels (12 pts/Rs.100), 4X flights (8 pts/Rs.100). Base: 4 pts/Rs.100 on flights/travel aggregators/forex; 2 pts/Rs.100 elsewhere. All pts (portal+base) transfer 1:1 to 20 partners. Portal accelerated cap 50K pts/yr. 3.5% forex. Rs.4,999 fee waived at Rs.8L spend.',
   milestones:'Rs.12L spend -> 10,000 bonus pts.'},

  // ── SBI Card Elite ───────────────────────────────────────────────────────────
  // Lifestyle card — NOT the miles/travel card. Points at 4pts=Rs.1 (0.25/pt).
  // No airline transfer partners. 5X on dining, departmental stores, groceries.
  {id:'sbi_card_elite',name:'SBI Card Elite',currency:'SBI Reward Points',baseRate:2/100,forexMarkup:0.0199,intlRate:0.02,intlTravelRate:0.02,
   categories:{'Flights':2/100,'Hotels':2/100,'Dining':10/100,'Shopping':2/100,'Groceries':10/100,'Entertainment':2/100,'Healthcare':2/100,'Education':2/100,'Utilities':2/100,'Insurance':2/100,'Fuel':0,'Rent':0,'Government':2/100,'Jewellery':2/100,'Wallet Loads':0,'International Transactions':0.02},
   exclusions:['Fuel','Rent','Wallet Loads'],dex:['Fuel','Rent','Wallet Loads'],
   partners:[],
   notes:'5X on dining, departmental stores and groceries (10 pts/Rs.100). 2 pts/Rs.100 on all other eligible spends. Points redeem at 4 pts = Rs.1 (Rs.0.25/pt) against catalogue — no airline/hotel transfer partners. 1.99% forex. Rs.4,999 fee waived at Rs.10L spend.',
   milestones:'Up to 50,000 bonus pts/yr on milestone spends. 2 movie tickets/month (BookMyShow). 2 domestic lounge/quarter + 6 intl/year.'},

  // ── ICICI MakeMyTrip ─────────────────────────────────────────────────────────
  // myCash = Rs.1, redeemable ONLY on MakeMyTrip (NOT transferable to airline miles)
  {id:'icici_mmt',name:'ICICI MakeMyTrip',currency:'myCash',baseRate:1/100,forexMarkup:0.0099,intlRate:0.01,intlTravelRate:0.01,
   categories:{'Flights':3/100,'Hotels':6/100,'Dining':1/100,'Shopping':1/100,'Groceries':1/100,'Entertainment':1/100,'Healthcare':1/100,'Education':1/100,'Utilities':1/100,'Insurance':1/100,'Fuel':0,'Rent':0,'Government':1/100,'Jewellery':1/100,'Wallet Loads':0,'International Transactions':0.01},
   exclusions:['Fuel','Rent','Wallet Loads'],dex:['Fuel','Rent','Wallet Loads'],
   partners:[],
   notes:'1 myCash = Rs.1 redeemable ONLY on MakeMyTrip (not transferable to airline miles). 6% on hotel bookings via MMT; 3% on flights/holidays/cabs/buses via MMT; 1% on all other spends. 0.99% forex. Rs.999 fee waived at Rs.3L spend.',
   milestones:'MMTBLACK Gold on joining. Rs.50K + 4 trips -> Gold tier; Rs.2L + 4 trips -> Platinum tier.'},

  // ── Amex Platinum Reserve ────────────────────────────────────────────────────
  // 1 MR per Rs.50 on all eligible spends. Airline transfers at 2:1 (2 MR = 1 mile).
  // Same MR pool as Amex Plat Travel but worse transfer ratio for airlines.
  {id:'amex_plat_reserve',name:'Amex Platinum Reserve',currency:'Membership Rewards (MR)',baseRate:1/50,forexMarkup:0.035,intlRate:0.02,intlTravelRate:0.02,
   categories:{'Flights':1/50,'Hotels':1/50,'Dining':1/50,'Shopping':1/50,'Groceries':1/50,'Entertainment':1/50,'Healthcare':1/50,'Education':1/50,'Utilities':0,'Insurance':0,'Fuel':0,'Rent':1/50,'Government':1/50,'Jewellery':1/50,'Wallet Loads':0,'International Transactions':0.02},
   exclusions:['Utilities','Insurance','Fuel','Wallet Loads'],dex:['Utilities','Insurance','Fuel','Wallet Loads'],
   partners:[
     {name:'British Airways (Avios)',type:'airline'},{name:'Emirates Skywards',type:'airline'},
     {name:'Etihad Guest',type:'airline'},{name:'Qatar Privilege Club',type:'airline'},
     {name:'Singapore Airlines (KrisFlyer)',type:'airline'},{name:'Virgin Atlantic Flying Club',type:'airline'},
     {name:'Asia Miles (Cathay)',type:'airline'},
   ],
   notes:'1 MR per Rs.50 on all eligible spends (2% earn). Airline transfers at 2:1 (2 MR = 1 mile) — half the value of Amex Platinum Travel which transfers at 1:1. Exclusions: fuel, insurance, utilities. Complimentary Taj Epicure + Accor+ Explorer memberships (card benefit, not MR transfer). Rs.10,000 fee waived at Rs.10L spend.',
   milestones:'Accor+ Explorer membership (30% dining discount). Priority Pass for intl lounges.'},

]; // end _LEGACY_DC

var DEFAULT_CATS = ['Flights','Hotels','Dining','Shopping','Groceries','Entertainment','Healthcare','Education','Utilities','Insurance','Fuel','Rent','Government','Jewellery','Wallet Loads','International Transactions'];

// Static partner list: always shown in selects and partner matrix regardless of cards added
var DEFAULT_PARTNER_TYPES = {
  // Airlines
  'Aer Lingus AerClub':'airline','Air Canada Aeroplan':'airline',
  'Air France KLM (Flying Blue)':'airline','Air India (Maharaja Club)':'airline',
  'Asia Miles (Cathay)':'airline','British Airways (Avios)':'airline',
  'Emirates Skywards':'airline','Ethiopian ShebaMiles':'airline',
  'Etihad Guest':'airline','Finnair Plus':'airline','Iberia Plus':'airline',
  'JAL Mileage Bank':'airline','Lufthansa Miles&More':'airline',
  'Qatar Privilege Club':'airline','SAS EuroBonus':'airline',
  'Singapore Airlines (KrisFlyer)':'airline','SpiceJet SpiceClub':'airline',
  'Turkish Airlines (Miles&Smiles)':'airline','United MileagePlus':'airline',
  'Vietnam Airlines (Lotusmiles)':'airline','Virgin Atlantic Flying Club':'airline',
  // Hotels
  'Accor Live Limitless':'hotel','Hilton Honors':'hotel',
  'IHCL / Taj Hotels':'hotel','IHG One Rewards':'hotel',
  'ITC Hotels':'hotel','Marriott Bonvoy':'hotel',
  'Orchid Rewards':'hotel','Radisson Rewards':'hotel',
};

var DEFAULT_PV = {
  // Airlines (alphabetical)
  'Aer Lingus AerClub':1,'Air Canada Aeroplan':1,'Air France KLM (Flying Blue)':1,
  'Air India (Maharaja Club)':0.9,'Asia Miles (Cathay)':1,'British Airways (Avios)':1,
  'Emirates Skywards':1,'Ethiopian ShebaMiles':1,'Etihad Guest':1,
  'Finnair Plus':0.3,'Iberia Plus':1,'JAL Mileage Bank':1,
  'Lufthansa Miles&More':1,'Qatar Privilege Club':1,'SAS EuroBonus':1,
  'Singapore Airlines (KrisFlyer)':1,'SpiceJet SpiceClub':0.5,
  'Turkish Airlines (Miles&Smiles)':1,'United MileagePlus':1,
  'Vietnam Airlines (Lotusmiles)':0.3,'Virgin Atlantic Flying Club':1,
  // Hotels (alphabetical)
  'Accor Live Limitless':2,'Hilton Honors':0.4,'IHCL / Taj Hotels':1,
  'IHG One Rewards':0.5,'ITC Hotels':1,'Marriott Bonvoy':0.6,
  'Orchid Rewards':0.5,'Radisson Rewards':0.6,
  // Portal / catalogue partners
};

// ── State ─────────────────────────────────────────────────────────────────────
var cards   = JSON.parse(JSON.stringify(DC));
var cats    = DEFAULT_CATS.slice();
var pv      = Object.assign({}, DEFAULT_PV);
var rwChart = null;
var rpChart = null;
var splitRwChart = null;
var splitRpChart = null;
var lastAlloc = null; var lastCardTotals = null; var lastPartnerTotals = null; var lastTotalSpend = 0;
var intlTravelPct = 0.5; // % of international spend that is travel (flights/hotels)

function getAllPartners() {
  return Object.keys(DEFAULT_PARTNER_TYPES).map(function(name) {
    return {name: name, type: DEFAULT_PARTNER_TYPES[name]};
  });
}
// ── Core calculation helpers ──────────────────────────────────────────────────

// Returns ₹ value per 1 card point for a given partner (accounting for transfer ratio)
function partnerRupeeVal(cardId, partnerName) {
  var cn=canonical(partnerName);
  return (pv[cn]||0)*transferRatio(cardId,cn);
}
// Returns {name, rupeePer1Pt} for the best partner for this card
function bestPartner(card) {
  var best=null,bestV=0;
  (card.partners||[]).forEach(function(p){
    if(p.type==='cashback')return;
    var cn=canonical(p.name);
    var v=partnerRupeeVal(card.id,cn);
    if(v>bestV){best=cn;bestV=v;}
  });
  return{name:best,val:bestV};
}
function cardRate(card, cat) {
  if (card.exclusions.indexOf(cat) >= 0) return 0;
  if (cat === 'International Transactions') {
    // Blend: travel portion earns intlTravelRate, remainder earns intlRate
    var iRate  = card.intlRate  !== undefined ? card.intlRate  : card.baseRate;
    var itRate = card.intlTravelRate !== undefined ? card.intlTravelRate : iRate;
    return iRate + (itRate - iRate) * intlTravelPct;
  }
  return card.categories[cat] !== undefined ? card.categories[cat] : card.baseRate;
}

// Points earned on a spend
function earnPts(card, cat, spend) {
  return spend * cardRate(card, cat);
}

// ₹ value: points × best partner ₹/pt
function calcV(card, cat, spend) {
  return earnPts(card, cat, spend) * bestPartner(card).val;
}

// ₹ value with a specific partner
function calcVP(card, cat, spend, partnerName) {
  return earnPts(card, cat, spend) * partnerRupeeVal(card.id, partnerName);
}

// Net forex cost for international transactions (markup + 18% GST)
function forexCost(card, spend) {
  if (!card.forexMarkup || card.forexMarkup === 0) return 0;
  return spend * card.forexMarkup * 1.18;
}

function fmt(n) {
  if (!n || n === 0) return '\u20b90';
  if (n >= 100000) return '\u20b9' + (n/100000).toFixed(2) + 'L';
  return '\u20b9' + Math.round(n).toLocaleString('en-IN');
}
function fmtPts(n) {
  if (!n) return '0';
  if (n >= 100000) return (n/100000).toFixed(1) + 'L pts';
  return Math.round(n).toLocaleString('en-IN') + ' pts';
}
function setOut(id, val, zero) {
  var el = document.getElementById(id); if (!el) return;
  el.textContent = val;
  el.className = 'omv' + (zero ? ' zero' : '');
}

// ── Tab navigation ────────────────────────────────────────────────────────────
function showTab(name, el) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
  document.getElementById('tab-' + name).classList.add('active');
  el.classList.add('active');
  if (name === 'data') initDataTab();
  if (name === 'inputs') renderInputsTab();
}

function syncSplit(c) {
  var f = document.getElementById('pct-flights'), h = document.getElementById('pct-hotels');
  if (c === 'f') { var v = Math.min(100, Math.max(0, parseFloat(f.value)||0)); f.value = v; h.value = 100-v; }
  else { var v = Math.min(100, Math.max(0, parseFloat(h.value)||0)); h.value = v; f.value = 100-v; }
}

function populateTravelSelects() {
  var all = getAllPartners();
  var aSel = document.getElementById('default-airline');
  var hSel = document.getElementById('default-hotel');
  aSel.innerHTML = all.filter(function(p){return p.type==='airline';}).map(function(p){return '<option value="'+p.name+'">'+p.name+'</option>';}).join('');
  hSel.innerHTML = all.filter(function(p){return p.type==='hotel';}).map(function(p){return '<option value="'+p.name+'">'+p.name+'</option>';}).join('');
  function setDef(sel, name) { var o = sel.querySelector('option[value="'+name+'"]'); if (o) o.selected = true; }
  setDef(aSel, 'Singapore Airlines (KrisFlyer)');
  setDef(hSel, 'IHCL / Taj Hotels');
}

function initSpendInputs() {
  var c=document.getElementById('spend-inputs');if(!c)return;c.innerHTML='';
  var qs=document.getElementById('quick-category');
  if(qs)qs.innerHTML=cats.map(function(cat){return'<option value="'+cat+'">'+cat+'</option>';}).join('');
  var mid=Math.ceil(cats.length/2),col1=document.createElement('div'),col2=document.createElement('div');
  cats.forEach(function(cat,i){
    var row=document.createElement('div');row.className='spend-row';
    var extraCtrl = '';
    if(cat === 'International Transactions'){
      extraCtrl = '<div style="display:flex;align-items:center;gap:.3rem;margin-top:.22rem">'+
        '<span style="font-size:.68rem;color:var(--muted);white-space:nowrap">% Travel:</span>'+
        '<input type="number" id="intl-travel-pct" min="0" max="100" step="5" value="'+(intlTravelPct*100).toFixed(0)+'"'+
        ' style="width:58px;padding:.18rem .35rem;font-size:.76rem;text-align:right"'+
        ' oninput="intlTravelPct=Math.min(1,Math.max(0,(parseFloat(this.value)||0)/100))" title="% of international spend that is travel (flights/hotels)">'+
        '<span style="font-size:.68rem;color:var(--muted)">%</span>'+
        '</div>';
    }
    row.innerHTML='<div><span class="scat">'+cat+'</span>'+extraCtrl+'</div>'+
      '<input type="text" inputmode="numeric" id="spend-'+cat+'" data-raw="0" value="0" placeholder="0"'+
      ' onfocus="spendFocus(this)" onblur="spendBlur(this)"'+
      ' oninput="this.dataset.raw=parseFloat(this.value.replace(/,/g,\'\'))||0">';
    (i<mid?col1:col2).appendChild(row);
  });
  var grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:0 1.5rem';
  grid.appendChild(col1);grid.appendChild(col2);
  var tr=document.createElement('div');
  tr.style.cssText='display:flex;justify-content:space-between;align-items:center;padding:.5rem 0 0;border-top:1px solid var(--border);margin-top:.3rem';
  tr.innerHTML='<span style="font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)">Total Annual Spend</span><span id="spend-total-display" style="font-family:var(--font-mono);color:var(--accent);font-size:.88rem">\u20b90</span>';
  c.appendChild(grid);c.appendChild(tr);
}
function spendFocus(el){var r=parseFloat(el.dataset.raw)||0;el.value=r||'';el.select();}
function spendBlur(el){var v=parseFloat(el.value.replace(/,/g,''))||0;el.dataset.raw=v;el.value=v?v.toLocaleString('en-IN'):'0';updateSpendTotal();}
function updateSpendTotal(){var t=0;cats.forEach(function(cat){var el=document.getElementById('spend-'+cat);if(el)t+=parseFloat(el.dataset.raw)||0;});var el=document.getElementById('spend-total-display');if(el)el.textContent='\u20b9'+(t||0).toLocaleString('en-IN');}
function getRawSpend(cat){var el=document.getElementById('spend-'+cat);if(!el)return 0;return parseFloat(el.dataset.raw||el.value.replace(/,/g,''))||0;}
// ── Optimizer helper: evaluate any cardMap {cat→card|null} including milestones
// spends = {cat: amount} map; ALL spend on a card counts toward its milestone threshold
function evalCardMap(cardMap, spends, scenNote) {
  var _alloc={},_ct={},_pt={},_tv=0;
  cards.forEach(function(c){_ct[c.id]=0;});
  cats.forEach(function(cat){
    var spend=spends[cat]||0,card=cardMap[cat]||null;
    if(!spend||!card){_alloc[cat]={card:null,pts:0,value:0,spend:spend,partner:null};return;}
    var pts=earnPts(card,cat,spend);
    var v=calcV(card,cat,spend);
    if(cat==='International Transactions')v=Math.max(0,v-forexCost(card,spend));
    var bp=bestPartner(card).name;
    _alloc[cat]={card:card,pts:pts,value:v,spend:spend,partner:bp};
    _ct[card.id]=(_ct[card.id]||0)+v;
    if(bp)_pt[bp]=(_pt[bp]||0)+v;
    _tv+=v;
  });
  var _cs={};cards.forEach(function(c){_cs[c.id]=0;});
  cats.forEach(function(cat){var card=cardMap[cat];if(card)_cs[card.id]=(_cs[card.id]||0)+(spends[cat]||0);});
  var _mRows=[],_mVal=0;
  cards.forEach(function(card){
    var mb=getEffectiveMilestones(card);
    if(!mb.length)return;
    var cSpend=_cs[card.id]||0,bp=bestPartner(card);
    mb.forEach(function(m){
      var mVal=(m.bonusValue||0)+(m.bonusPts||0)*bp.val;
      var met=cSpend>=m.threshold;
      _mRows.push({card:card,label:m.label,value:mVal,met:met,threshold:m.threshold,shortfall:met?0:m.threshold-cSpend});
      if(met){_mVal+=mVal;_ct[card.id]=(_ct[card.id]||0)+mVal;}
    });
  });
  _tv+=_mVal;
  return{alloc:_alloc,cardTotals:_ct,partnerTotals:_pt,totalVal:_tv,milestoneRows:_mRows,milestoneVal:_mVal,note:scenNote||null};
}

// Evaluates a scenario like evalCardMap but splits one category between two cards.
// baseCardMap covers all categories; splitCat/card1/spend1/card2/spend2 override that category.
function evalSplitScenario(baseCardMap, splitCat, card1, spend1, card2, spend2, spends) {
  var _alloc={},_ct={},_pt={},_cs={},_tv=0;
  cards.forEach(function(c){_ct[c.id]=0;_cs[c.id]=0;});
  cats.forEach(function(cat){
    var spend=spends[cat]||0;
    if(cat===splitCat){
      if(!spend){_alloc[cat]={card:null,pts:0,value:0,spend:0,partner:null};return;}
      var pts1=earnPts(card1,cat,spend1),v1=calcV(card1,cat,spend1);
      var pts2=earnPts(card2,cat,spend2),v2=calcV(card2,cat,spend2);
      var bp1=bestPartner(card1).name,bp2=bestPartner(card2).name;
      _alloc[cat]={card:card1,pts:pts1+pts2,value:v1+v2,spend:spend,partner:bp1,
        isSplit:true,card2:card2,spend1:spend1,spend2:spend2,
        pts1:pts1,pts2:pts2,val1:v1,val2:v2,partner1:bp1,partner2:bp2};
      _ct[card1.id]+=v1;_ct[card2.id]+=v2;
      _cs[card1.id]+=spend1;_cs[card2.id]+=spend2;
      if(bp1)_pt[bp1]=(_pt[bp1]||0)+v1;
      if(bp2)_pt[bp2]=(_pt[bp2]||0)+v2;
      _tv+=v1+v2;
    } else {
      var card=baseCardMap[cat]||null;
      if(!spend||!card){_alloc[cat]={card:null,pts:0,value:0,spend:spend,partner:null};return;}
      var pts=earnPts(card,cat,spend),v=calcV(card,cat,spend);
      if(cat==='International Transactions')v=Math.max(0,v-forexCost(card,spend));
      var bp=bestPartner(card).name;
      _alloc[cat]={card:card,pts:pts,value:v,spend:spend,partner:bp};
      _ct[card.id]+=v;_cs[card.id]+=spend;
      if(bp)_pt[bp]=(_pt[bp]||0)+v;
      _tv+=v;
    }
  });
  var _mRows=[],_mVal=0;
  cards.forEach(function(card){
    var mb=getEffectiveMilestones(card);if(!mb.length)return;
    var cSpend=_cs[card.id]||0,bp=bestPartner(card);
    mb.forEach(function(m){
      var mVal=(m.bonusValue||0)+(m.bonusPts||0)*bp.val;
      var met=cSpend>=m.threshold;
      _mRows.push({card:card,label:m.label,value:mVal,met:met,threshold:m.threshold,shortfall:met?0:m.threshold-cSpend});
      if(met){_mVal+=mVal;_ct[card.id]=(_ct[card.id]||0)+mVal;}
    });
  });
  _tv+=_mVal;
  // Annotate the split alloc entry with which milestones were unlocked per card
  if(_alloc[splitCat]&&_alloc[splitCat].isSplit){
    var _ms1=[],_ms2=[];
    _mRows.forEach(function(r){if(!r.met)return;if(r.card.id===card1.id)_ms1.push(r.label);if(r.card.id===card2.id)_ms2.push(r.label);});
    _alloc[splitCat].ms1=_ms1.join('; ');
    _alloc[splitCat].ms2=_ms2.join('; ');
  }
  var spd1=spend1>=100000?'₹'+(spend1/100000).toFixed(1)+'L':'₹'+Math.round(spend1/1000)+'K';
  var spd2=spend2>=100000?'₹'+(spend2/100000).toFixed(1)+'L':'₹'+Math.round(spend2/1000)+'K';
  var note=splitCat+': '+spd1+' on '+card1.name.split(' ').slice(-2).join(' ')+' / '+spd2+' on '+card2.name.split(' ').slice(-2).join(' ');
  return{alloc:_alloc,cardTotals:_ct,partnerTotals:_pt,totalVal:_tv,milestoneRows:_mRows,milestoneVal:_mVal,note:note};
}

// ── Main optimizer ────────────────────────────────────────────────────────────
function runOptimizer() {
  var spends={}, totalSpend=0;
  cats.forEach(function(cat){ var v=getRawSpend(cat); spends[cat]=v; totalSpend+=v; });
  var pctF=(parseFloat(document.getElementById('pct-flights').value)||50)/100;
  var pctH=(parseFloat(document.getElementById('pct-hotels').value)||50)/100;
  var defAirline=document.getElementById('default-airline').value;
  var defHotel=document.getElementById('default-hotel').value;

  // ── Scenario A: greedy — best earn rate per category independently ─────────
  var greedyMap={};
  cats.forEach(function(cat){
    var spend=spends[cat]||0;
    if(!spend){greedyMap[cat]=null;return;}
    var bestCard=null,bestV=0;
    cards.forEach(function(card){var v=calcV(card,cat,spend);if(v>bestV){bestCard=card;bestV=v;}});
    greedyMap[cat]=bestCard;
  });
  var bestScen=evalCardMap(greedyMap,spends,null);

  // ── Scenarios B/C: concentrate spend on each milestone card ───────────────
  // B = all-in on that card; C = shift cheapest categories to hit first unmet milestone
  cards.forEach(function(fc){
    var fcMB=getEffectiveMilestones(fc);
    if(!fcMB.length)return;
    // B: all spend on fc
    var sMap={};
    cats.forEach(function(cat){sMap[cat]=spends[cat]>0?fc:null;});
    var rB=evalCardMap(sMap,spends,'All spend on '+fc.name+' to unlock milestones');
    if(rB.totalVal>bestScen.totalVal)bestScen=rB;
    // C: greedy + cheapest category shifts to reach first unmet milestone
    var fcGreedySpend=0;
    cats.forEach(function(cat){if(greedyMap[cat]===fc)fcGreedySpend+=(spends[cat]||0);});
    var firstUnmet=null;
    fcMB.forEach(function(m){if(!firstUnmet&&fcGreedySpend<m.threshold)firstUnmet=m;});
    if(firstUnmet){
      var gap=firstUnmet.threshold-fcGreedySpend;
      var shiftable=[];
      cats.forEach(function(cat){
        var spend=spends[cat]||0;if(!spend)return;
        var curCard=greedyMap[cat];if(curCard===fc)return;
        var curV=curCard?calcV(curCard,cat,spend):0;
        shiftable.push({cat:cat,spend:spend,costPerRupee:(curV-calcV(fc,cat,spend))/spend});
      });
      shiftable.sort(function(a,b){return a.costPerRupee-b.costPerRupee;});
      var cMap=Object.assign({},greedyMap);
      var shifted=0;
      for(var i=0;i<shiftable.length&&shifted<gap;i++){cMap[shiftable[i].cat]=fc;shifted+=shiftable[i].spend;}
      var rC=evalCardMap(cMap,spends,'Spend shifted to '+fc.name+' to unlock '+firstUnmet.label);
      if(rC.totalVal>bestScen.totalVal)bestScen=rC;
    }
  });

  // ── Scenario D: within-category splits ──────────────────────────────────────
  // For each category, try splitting spend between two cards where at least one
  // has milestones.  Uses greedyMap as the base for all other categories so the
  // card-spend totals — and therefore milestone eligibility — are re-evaluated
  // correctly for every candidate split point.
  cats.forEach(function(cat){
    var catSpend=spends[cat]||0; if(!catSpend) return;
    for(var pi=0;pi<cards.length;pi++){
      for(var pj=pi+1;pj<cards.length;pj++){
        var c1=cards[pi],c2=cards[pj];
        var ms1=getEffectiveMilestones(c1),ms2=getEffectiveMilestones(c2);
        if(!ms1.length&&!ms2.length) continue;
        // Card spend from greedyMap on all OTHER categories
        var gcs1=0,gcs2=0;
        cats.forEach(function(c){
          if(c===cat)return;
          var gc=greedyMap[c];if(!gc)return;
          if(gc.id===c1.id)gcs1+=spends[c]||0;
          if(gc.id===c2.id)gcs2+=spends[c]||0;
        });
        // Candidate amounts for c1: 10% steps + milestone-threshold amounts for both cards
        var seen={},cands=[],ca;
        for(var s=1;s<=9;s++){ca=Math.round(catSpend*s/10);if(ca>0&&ca<catSpend&&!seen[ca]){seen[ca]=1;cands.push(ca);}}
        ms1.forEach(function(m){ca=m.threshold-gcs1;if(ca>0&&ca<catSpend&&!seen[ca]){seen[ca]=1;cands.push(ca);}});
        ms2.forEach(function(m){ca=catSpend-(m.threshold-gcs2);if(ca>0&&ca<catSpend&&!seen[ca]){seen[ca]=1;cands.push(ca);}});
        for(var k=0;k<cands.length;k++){
          var a1=cands[k],a2=catSpend-a1;
          var rD=evalSplitScenario(greedyMap,cat,c1,a1,c2,a2,spends);
          if(rD.totalVal>bestScen.totalVal)bestScen=rD;
        }
      }
    }
  });

  var alloc=bestScen.alloc;
  var cardTotals=bestScen.cardTotals;
  var partnerTotals=bestScen.partnerTotals;
  var totalVal=bestScen.totalVal;
  var milestoneRows=bestScen.milestoneRows;
  var totalMilestoneVal=bestScen.milestoneVal;

  // Render milestone section
  var msEl=document.getElementById('milestone-section');
  if(msEl){
    if(milestoneRows.length){
      var COL5='1fr 1fr 80px 75px 85px';
      var msHtml='<div class="card" style="margin-top:0;margin-bottom:0;padding:1rem 1.2rem">'+
        '<div class="card-title" style="margin-bottom:.4rem">Milestone Benefits</div>'+
        (bestScen.note?'<div style="font-size:.73rem;color:var(--accent);margin-bottom:.7rem;font-style:italic">★ '+bestScen.note+'</div>':'')+
        '<div style="display:grid;grid-template-columns:'+COL5+';gap:.3rem .7rem;align-items:center;font-size:.69rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;padding-bottom:.35rem;border-bottom:1px solid var(--border)">'+
        '<span>Card</span><span>Milestone</span><span>Threshold</span><span>Value</span><span>Status</span></div>';
      milestoneRows.forEach(function(r){
        var thr=r.threshold>=100000?'₹'+(r.threshold/100000).toFixed(1)+'L':'₹'+r.threshold.toLocaleString('en-IN');
        var shortfallStr=r.shortfall>=100000?'₹'+(r.shortfall/100000).toFixed(1)+'L more':'₹'+Math.round(r.shortfall/1000)+'K more';
        msHtml+='<div style="display:grid;grid-template-columns:'+COL5+';gap:.3rem .7rem;align-items:center;font-size:.78rem;padding:.35rem 0;border-bottom:1px solid rgba(42,42,58,.3)">'+
          '<span style="font-weight:500">'+r.card.name.split(' ').slice(-2).join(' ')+'</span>'+
          '<span style="color:var(--muted);font-size:.73rem">'+r.label+'</span>'+
          '<span class="fm" style="color:var(--muted)">'+thr+'</span>'+
          '<span class="fm" style="color:var(--success)">'+fmt(r.value)+'</span>'+
          '<span style="color:'+(r.met?'var(--success)':'var(--warning)')+';font-size:.71rem">'+(r.met?'✓ Met':shortfallStr)+'</span>'+
          '</div>';
      });
      if(totalMilestoneVal>0){
        msHtml+='<div style="font-size:.78rem;padding:.45rem 0 .1rem;border-top:2px solid var(--border);font-weight:600;text-align:right;color:var(--muted)">'+
          'Milestone value included in total: <span class="fm" style="color:var(--success)">'+fmt(totalMilestoneVal)+'</span></div>';
      }
      msHtml+='</div>';
      msEl.innerHTML=msHtml;
      msEl.style.display='block';
    } else {
      msEl.style.display='none';
      msEl.innerHTML='';
    }
  }

  // ── Annual fees & renewal benefits ───────────────────────────────────────────
  var usedCards=[];
  cards.forEach(function(card){
    var used=cats.some(function(cat){
      var a=alloc[cat];
      return a&&((a.card&&a.card.id===card.id)||(a.card2&&a.card2.id===card.id));
    });
    if(used)usedCards.push(card);
  });
  var totalFees=0,totalRenewVal=0,feeRows=[];
  usedCards.forEach(function(card){
    var fee=card.annualFee||0;
    var rv=calcRenewalVal(card);
    totalFees+=fee;totalRenewVal+=rv;
    feeRows.push({card:card,fee:fee,renewVal:rv,hasData:card.annualFee!==undefined});
  });
  var netValue=totalVal-totalFees+totalRenewVal;
  var someUnknown=usedCards.some(function(c){return c.annualFee===undefined;});

  var feeEl=document.getElementById('fee-section');
  if(feeEl){
    if(feeRows.length&&(totalFees>0||totalRenewVal>0)){
      var FC='1fr 80px 90px 80px';
      var fHtml='<div class="card" style="margin-top:0;margin-bottom:0;padding:1rem 1.2rem">'+
        '<div class="card-title" style="margin-bottom:.4rem">Annual Fees &amp; Renewal Benefits</div>'+
        '<div style="display:grid;grid-template-columns:'+FC+';gap:.3rem .7rem;font-size:.69rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;padding-bottom:.35rem;border-bottom:1px solid var(--border)">'+
        '<span>Card</span><span class="fm">Annual Fee</span><span class="fm">Renewal Benefit</span><span class="fm">Net</span></div>';
      feeRows.forEach(function(r){
        var fStr=r.hasData?(r.fee>0?'−'+fmt(r.fee):'₹0'):'—';
        var rvStr=r.renewVal>0?'+'+fmt(r.renewVal):'—';
        var net=r.renewVal-r.fee;
        var netStr=net===0?'—':(net>0?'+':'−')+fmt(Math.abs(net));
        fHtml+='<div style="display:grid;grid-template-columns:'+FC+';gap:.3rem .7rem;font-size:.78rem;padding:.35rem 0;border-bottom:1px solid rgba(42,42,58,.3);align-items:center">'+
          '<span style="font-size:.74rem">'+r.card.name.split(' ').slice(-2).join(' ')+'</span>'+
          '<span class="fm" style="color:'+(r.fee>0?'var(--danger)':'var(--muted)')+'">'+fStr+'</span>'+
          '<span class="fm" style="color:'+(r.renewVal>0?'var(--success)':'var(--muted)')+'">'+rvStr+'</span>'+
          '<span class="fm" style="color:'+(net>=0?'var(--success)':'var(--danger)')+'">'+netStr+'</span>'+
          '</div>';
      });
      var tn=totalRenewVal-totalFees;
      var tnStr=(tn>0?'+':'−')+fmt(Math.abs(tn));
      fHtml+='<div style="display:grid;grid-template-columns:'+FC+';gap:.3rem .7rem;font-size:.78rem;padding:.45rem 0 .1rem;border-top:2px solid var(--border);font-weight:600;align-items:center">'+
        '<span style="color:var(--muted)">TOTAL</span>'+
        '<span class="fm" style="color:var(--danger)">−'+fmt(totalFees)+'</span>'+
        '<span class="fm" style="color:'+(totalRenewVal>0?'var(--success)':'var(--muted)')+'">'+
        (totalRenewVal>0?'+'+fmt(totalRenewVal):'—')+'</span>'+
        '<span class="fm" style="color:'+(tn>=0?'var(--success)':'var(--danger)')+'">'+tnStr+'</span></div>';
      if(someUnknown)fHtml+='<div style="font-size:.68rem;color:var(--muted);margin-top:.4rem">— = fee data unavailable; click Get T&amp;Cs to populate</div>';
      fHtml+='</div>';
      feeEl.innerHTML=fHtml;feeEl.style.display='block';
    } else {
      feeEl.style.display='none';feeEl.innerHTML='';
    }
  }

  // Cache for Feature 2
  lastAlloc=alloc;lastCardTotals=cardTotals;lastPartnerTotals=partnerTotals;lastTotalSpend=totalSpend;

  var bEntry=Object.entries(cardTotals).sort(function(a,b){return b[1]-a[1];})[0];
  var bCard=bEntry?cards.find(function(c){return c.id===bEntry[0];}):null;
  var topCE=Object.entries(alloc).filter(function(e){return e[1].value>0;}).sort(function(a,b){return b[1].value-a[1].value;})[0];

  setOut('o-netval',fmt(netValue),netValue<=0);
  setOut('o-netrate',totalSpend>0?(netValue/totalSpend*100).toFixed(2)+'%':'—',netValue<=0);
  setOut('o-total',fmt(totalVal),totalVal===0);
  setOut('o-rate',totalSpend>0?(totalVal/totalSpend*100).toFixed(2)+'%':'—',totalVal===0);
  setOut('o-bcard',bCard?bCard.name.split(' ').slice(-2).join(' '):'—',!bCard);
  var bCardSpend=0;
  if(bCard){cats.forEach(function(cat){
    var a=alloc[cat];if(!a)return;
    if(a.isSplit){if(a.card&&a.card.id===bCard.id)bCardSpend+=a.spend1||0;if(a.card2&&a.card2.id===bCard.id)bCardSpend+=a.spend2||0;}
    else if(a.card&&a.card.id===bCard.id)bCardSpend+=a.spend||0;
  });}
  var bCardVal=bEntry?bEntry[1]:0;
  setOut('o-brate',bCard&&bCardSpend>0?(bCardVal/bCardSpend*100).toFixed(2)+'%':'—',!bCard);
  setOut('o-topcat',topCE?topCE[0]+' ('+fmt(topCE[1].value)+')':'—',!topCE);

  // Allocation table: 6 columns
  var COL6='110px 1fr 85px 80px 1fr 85px';
  var tbl=document.getElementById('alloc-table');tbl.innerHTML='';
  var hdr=document.getElementById('alloc-header');
  if(hdr){hdr.style.gridTemplateColumns=COL6;hdr.innerHTML='<span>Category</span><span>Best Card</span><span>Spend ₹</span><span>Points</span><span>Best Partner</span><span>Value ₹</span>';}

  // Build per-card milestone-met lookup for row annotations
  var cardMilestoneVal={};
  milestoneRows.forEach(function(r){if(r.met)cardMilestoneVal[r.card.id]=(cardMilestoneVal[r.card.id]||0)+r.value;});

  var sc=cats.filter(function(cat){return spends[cat]>0;}).sort(function(a,b){return(alloc[b]?alloc[b].value:0)-(alloc[a]?alloc[a].value:0);});
  var tPts=0,tVal=0,tSpend=0;
  sc.forEach(function(cat){
    var a=alloc[cat],row=document.createElement('div');
    if(a.isSplit){
      row.style.cssText='display:grid;grid-template-columns:'+COL6+';gap:.3rem;padding:.42rem 0 .38rem;border-bottom:1px solid rgba(42,42,58,.3);font-size:.79rem;align-items:start';
      var ms1h=a.ms1?'<div style="font-size:.66rem;color:var(--accent);margin-top:.1rem">'+a.ms1+'</div>':'';
      var ms2h=a.ms2?'<div style="font-size:.66rem;color:var(--accent);margin-top:.04rem">'+a.ms2+'</div>':'';
      row.innerHTML=
        '<span style="font-weight:500">'+cat+'<span class="split-tag">split</span></span>'+
        '<span style="font-size:.73rem"><div><span style="color:var(--text)">'+a.card.name+'</span> <span style="color:var(--muted);font-size:.69rem">'+fmt(a.spend1)+'</span>'+ms1h+'</div>'+
        '<div style="margin-top:.2rem"><span style="color:var(--text)">'+a.card2.name+'</span> <span style="color:var(--muted);font-size:.69rem">'+fmt(a.spend2)+'</span>'+ms2h+'</div></span>'+
        '<span class="fm" style="color:var(--muted);font-size:.74rem">'+fmt(a.spend)+'</span>'+
        '<span class="fm" style="color:var(--accent);font-size:.73rem">'+fmtPts(a.pts1)+'<div style="margin-top:.2rem">'+fmtPts(a.pts2)+'</div></span>'+
        '<span style="font-size:.69rem;color:var(--accent3)">'+(a.partner1||'—')+'<div style="margin-top:.2rem">'+(a.partner2||'—')+'</div></span>'+
        '<span class="fm" style="color:var(--success)">'+fmt(a.val1)+'<div style="margin-top:.2rem">'+fmt(a.val2)+'</div></span>';
    } else {
      row.style.cssText='display:grid;grid-template-columns:'+COL6+';gap:.3rem;padding:.42rem 0;border-bottom:1px solid rgba(42,42,58,.3);font-size:.79rem;align-items:center';
      // Show milestone badge when card earns 0 pts but is recommended for milestone value
      var isMilestonePick=a.card&&a.pts===0&&cardMilestoneVal[a.card.id]>0;
      var valueCell=isMilestonePick
        ?'<span class="fm" style="color:var(--accent3)">milestone ★</span>'
        :'<span class="fm" style="color:var(--success)">'+fmt(a.value)+'</span>';
      row.innerHTML=
        '<span style="font-weight:500">'+cat+'</span>'+
        '<span style="font-size:.74rem;color:'+(a.card?'var(--text)':'var(--muted)')+'">'+( a.card?a.card.name:'No rewards')+'</span>'+
        '<span class="fm" style="color:var(--muted);font-size:.74rem">'+fmt(a.spend)+'</span>'+
        '<span class="fm" style="color:var(--accent);font-size:.74rem">'+fmtPts(a.pts)+'</span>'+
        '<span style="font-size:.7rem;color:var(--accent3)">'+(a.partner||'—')+'</span>'+
        valueCell;
    }
    tbl.appendChild(row);
    tPts+=a.pts||0;tVal+=a.value||0;tSpend+=a.spend||0;
  });
  var grandTotal=tVal+totalMilestoneVal;
  var tot=document.createElement('div');
  tot.style.cssText='display:grid;grid-template-columns:'+COL6+';gap:.3rem;padding:.5rem 0 .2rem;border-top:2px solid var(--border);font-size:.8rem;align-items:center;font-weight:600';
  tot.innerHTML='<span style="color:var(--muted)">TOTAL</span>'+
    (totalMilestoneVal>0?'<span style="font-size:.68rem;color:var(--accent3);font-weight:400">incl. '+fmt(totalMilestoneVal)+' milestones</span>':'<span></span>')+
    '<span class="fm" style="color:var(--muted);font-size:.74rem">'+fmt(tSpend)+'</span>'+
    '<span class="fm" style="color:var(--accent)">'+fmtPts(tPts)+'</span>'+
    '<span></span><span class="fm" style="color:var(--success)">'+fmt(grandTotal)+'</span>';
  tbl.appendChild(tot);

  // Charts with value labels
  var cc=['#c9a84c','#8b5cf6','#06b6d4','#34d399','#f87171','#f59e0b','#ec4899','#60a5fa','#a3e635','#fb923c'];
  function mkChart(labels,values,colors){
    return{type:'doughnut',data:{labels:labels,datasets:[{data:values,backgroundColor:colors,borderWidth:0}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{
        legend:{position:'right',labels:{color:'#8888a0',font:{family:'DM Sans',size:10},boxWidth:10,
          generateLabels:function(chart){return chart.data.labels.map(function(label,i){
            var v=chart.data.datasets[0].data[i];
            var disp=v>=100000?'₹'+(v/100000).toFixed(1)+'L':'₹'+v.toLocaleString('en-IN');
            return{text:label+'  '+disp,fillStyle:chart.data.datasets[0].backgroundColor[i],strokeStyle:'transparent',lineWidth:0,index:i};
          });}
        }},
        tooltip:{callbacks:{label:function(ctx){return ' '+ctx.label+': ₹'+ctx.raw.toLocaleString('en-IN');}}}
      }}};
  }

  var cd=Object.entries(cardTotals).filter(function(e){return e[1]>0;}).sort(function(a,b){return b[1]-a[1];});
  if(rwChart)rwChart.destroy();
  rwChart=new Chart(document.getElementById('rewards-chart'),mkChart(
    cd.map(function(e){return(cards.find(function(c){return c.id===e[0];})||{name:e[0]}).name.split(' ').slice(-2).join(' ');}),
    cd.map(function(e){return Math.round(e[1]);}),cc));

  var pd=Object.entries(partnerTotals).filter(function(e){return e[1]>0;}).sort(function(a,b){return b[1]-a[1];}).slice(0,10);
  var pce=document.getElementById('partner-chart');
  if(pce&&pd.length){
    if(rpChart)rpChart.destroy();
    rpChart=new Chart(pce,mkChart(
      pd.map(function(e){return e[0].split(' (')[0];}),
      pd.map(function(e){return Math.round(e[1]);}),cc.slice().reverse()));
    document.getElementById('partner-chart-wrap').style.display='block';
  }
  document.getElementById('optimizer-results').style.display='block';
}

// ── Quick check ───────────────────────────────────────────────────────────────
function runQuickCheck() {
  var amt = parseFloat(document.getElementById('quick-amount').value)||0;
  var cat = document.getElementById('quick-category').value;
  // For Quick Check, all spend on one card \u2192 check if any milestone threshold is crossed
  var ranked = cards.map(function(card){
    var pts = earnPts(card, cat, amt);
    var bp  = bestPartner(card);
    var earnVal = calcV(card, cat, amt);
    if (cat === 'International Transactions') earnVal = Math.max(0, earnVal - forexCost(card, amt));
    var milestoneVal = 0;
    if (card.milestoneBonus && card.milestoneBonus.length) {
      card.milestoneBonus.forEach(function(m){
        if (amt >= m.threshold) milestoneVal += (m.bonusValue||0) + (m.bonusPts||0)*bp.val;
      });
    }
    return { card:card, pts:pts, value:earnVal+milestoneVal, earnVal:earnVal, milestoneVal:milestoneVal, rate:cardRate(card,cat), bestPartner:bp.name };
  }).sort(function(a,b){return b.value-a.value;});

  var list = document.getElementById('quick-card-list'); list.innerHTML = '';
  ranked.slice(0,5).forEach(function(r,i){
    var d = document.createElement('div'); d.className = 'result-row'+(i===0?' best':'');
    var detail = fmtPts(r.pts)+' \u00b7 '+(r.rate*100).toFixed(2)+'% earn';
    if (r.milestoneVal > 0) detail += ' <span style="color:var(--accent3)">+ \u20b9'+Math.round(r.milestoneVal).toLocaleString('en-IN')+' milestone</span>';
    d.innerHTML =
      '<div style="display:flex;align-items:center">'+
      '<div class="rk '+(i<3?'rk'+(i+1):'rkn')+'">'+(i+1)+'</div>'+
      '<div><div class="rn">'+r.card.name+'</div>'+
      '<div class="rd">'+detail+'</div></div></div>'+
      '<div class="rv"><div class="ra">'+fmt(r.value)+'</div>'+
      '<div class="rr">'+(amt>0?(r.value/amt*100).toFixed(2)+'% return':'')+'</div></div>';
    list.appendChild(d);
  });

  var bCard = ranked[0] && ranked[0].card;
  var bPts  = bCard ? earnPts(bCard, cat, amt) : 0;
  var rdm   = document.getElementById('quick-redemptions'); rdm.innerHTML = '';
  var sorted = ((bCard && bCard.partners)||[]).map(function(p){
    var ratio    = transferRatio(bCard.id, p.name);
    var rupeeVal = (pv[p.name]||0);
    var partnerPts = bPts * ratio;
    var total    = bPts * rupeeVal * ratio;
    return { name:p.name, type:p.type, rupeeVal:rupeeVal, ratio:ratio, partnerPts:partnerPts, total:total };
  }).filter(function(p){return p.total>0;}).sort(function(a,b){return b.total-a.total;}).slice(0,6);

  if (!sorted.length) {
    rdm.innerHTML = '<div style="color:var(--muted);font-size:.8rem">Set partner values in the Inputs tab to see redemption options.</div>';
  } else {
    sorted.forEach(function(p,i){
      rdm.insertAdjacentHTML('beforeend',
        '<div class="quick-result'+(i===0?' top':'')+'">'+
        '<div style="display:flex;justify-content:space-between;align-items:center">'+
        '<div><span class="partner-tag '+p.type+'">'+p.name+'</span>'+
        '<span style="font-size:.72rem;color:var(--muted);margin-left:.4rem">'+
        Math.round(p.partnerPts).toLocaleString('en-IN')+' pts @ \u20b9'+p.rupeeVal+'/pt'+
        (p.ratio!==1?' ('+p.ratio+'x ratio)':'')+
        '</span></div>'+
        '<span class="fm" style="color:var(--success)">'+fmt(p.total)+'</span></div></div>');
    });
  }
  document.getElementById('quick-results').style.display = 'block';
}

// ── Data tab ──────────────────────────────────────────────────────────────────
function initDataTab() {
  var sel = document.getElementById('data-card-select');
  // Sync dropdown with current cards array (handles both fresh load and state restore)
  var existing = Array.from(sel.options).map(function(o){return o.value;});
  cards.forEach(function(c){
    if (existing.indexOf(c.id) < 0) {
      var o = document.createElement('option'); o.value=c.id; o.textContent=c.name; sel.appendChild(o);
    }
  });
  renderCardDetail();
}

function renderCardDetail() {
  var sel = document.getElementById('data-card-select');
  var cardId = sel.value;
  var card = cards.find(function(c){return c.id===cardId;});
  if (!card) {
    document.getElementById('card-earn-rates').innerHTML =
      '<div class="card" style="margin-top:0;padding:2.5rem;text-align:center">'+
      '<div style="font-size:1.8rem;margin-bottom:.6rem;opacity:.3">◈</div>'+
      '<div style="color:var(--muted);font-size:.9rem">No cards added yet.</div>'+
      '<div style="color:var(--muted);font-size:.78rem;margin-top:.3rem">Add a card in the <strong style="color:var(--accent)">Inputs</strong> tab to view earn rates here.</div>'+
      '</div>';
    document.getElementById('card-detail-right').innerHTML = '';
    return;
  }
  var allCats = DEFAULT_CATS.concat(cats.filter(function(c){return DEFAULT_CATS.indexOf(c)<0;}));

  document.getElementById('card-earn-rates').innerHTML =
    '<div class="card" style="margin-top:0">'+
    '<div class="card-title">Earn Rates \u2014 '+card.name+'</div>'+
    '<table class="data-table"><thead><tr><th>Category</th><th>Earn Rate</th><th>Pts/\u20b9100</th></tr></thead><tbody>'+
    allCats.map(function(cat){
      var ex = card.exclusions.indexOf(cat) >= 0;
      var r  = ex ? 0 : (card.categories[cat]!==undefined ? card.categories[cat] : card.baseRate);
      return '<tr style="'+(ex?'opacity:.38':'')+'"><td>'+cat+'</td>'+
        '<td>'+(ex?'<span style="color:var(--danger);font-size:.74rem">Excluded</span>':(r*100).toFixed(2)+'%')+'</td>'+
        '<td class="fm">'+(r*100).toFixed(3)+'</td></tr>';
    }).join('')+'</tbody></table></div>';

  var chips = allCats.map(function(cat){
    var ex = card.exclusions.indexOf(cat) >= 0;
    return '<span class="exclusion-chip'+(ex?' active':'')+'" onclick="toggleExclusion(\''+card.id+'\',\''+cat+'\',this)">'+cat+'</span>';
  }).join('');

  var tags = (card.partners||[]).map(function(p){
    var ratio = transferRatio(card.id, p.name);
    var ratioStr = ratio === 1 ? '1:1' : ratio > 1 ? '1:'+ratio : (1/ratio)+':1';
    return '<span class="partner-tag '+p.type+'" title="Transfer ratio: '+ratioStr+'">'+p.name+' <small style="opacity:.7">'+ratioStr+'</small></span>';
  }).join('');

  var milestoneHtml;
  if (card.milestoneBonus && card.milestoneBonus.length) {
    var bp = bestPartner(card);
    milestoneHtml = '<table class="data-table"><thead><tr><th>Threshold</th><th>Benefit</th><th>Value ₹</th></tr></thead><tbody>'+
      card.milestoneBonus.map(function(m){
        var mVal = (m.bonusValue||0) + (m.bonusPts||0)*bp.val;
        var thr = m.threshold >= 100000 ? '₹'+(m.threshold/100000).toFixed(1)+'L' : '₹'+m.threshold.toLocaleString('en-IN');
        return '<tr><td>'+thr+'</td><td>'+m.label+'</td><td class="fm">'+(mVal>0?fmt(mVal):'—')+'</td></tr>';
      }).join('')+'</tbody></table>';
  } else {
    milestoneHtml = '<div style="font-size:.76rem;color:var(--muted);line-height:1.6">'+(card.milestones||'No milestone data available.')+'</div>';
  }

  document.getElementById('card-detail-right').innerHTML =
    '<div class="card">'+
    '<div class="card-title">Settings &amp; Partners</div>'+
    '<div style="display:flex;gap:.4rem;margin-bottom:.9rem">'+
    '<span class="badge badge-gold">'+(card.baseRate*100).toFixed(2)+'% base</span>'+
    '<span class="badge badge-green">'+card.currency+'</span></div>'+
    '<div style="font-size:.68rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:.45rem">Exclusion Toggle</div>'+
    '<div style="margin-bottom:.9rem">'+chips+'</div>'+
    '<div style="font-size:.68rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:.45rem">Redemption Partners (ratio shown)</div>'+
    '<div style="margin-bottom:.9rem">'+tags+'</div>'+
    '<div style="background:var(--surface2);border-radius:7px;padding:.8rem;font-size:.76rem;color:var(--muted);line-height:1.6">'+
    '<strong style="color:var(--accent);display:block;margin-bottom:.25rem">Notes</strong>'+card.notes+
    '</div>'+
    '<div style="margin-top:.75rem">'+
    '<div style="font-size:.68rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:.45rem">Milestone Benefits</div>'+
    milestoneHtml+
    '</div></div>';
}

function toggleExclusion(cardId, cat, el) {
  var card = cards.find(function(c){return c.id===cardId;}); if (!card) return;
  var idx  = card.exclusions.indexOf(cat);
  if (idx >= 0) { card.exclusions.splice(idx,1); el.classList.remove('active'); }
  else          { card.exclusions.push(cat);     el.classList.add('active'); }
  renderCardDetail();
}

function resetDataToDefaults() {
  cards.forEach(function(card){ card.exclusions = (card.dex || []).slice(); });
  renderCardDetail();
}

// ── Inputs tab ────────────────────────────────────────────────────────────────
function renderInputsTab() { renderCardList(); renderCatCols(); renderPartnerMatrix(); }

function renderCatCols() {
  var mid = Math.ceil(cats.length/2);
  ['cat-col-1','cat-col-2'].forEach(function(id,ci){
    var el = document.getElementById(id); el.innerHTML = '';
    cats.slice(ci===0?0:mid, ci===0?mid:cats.length).forEach(function(cat,i){
      var ri = ci===0?i:mid+i, isDef = DEFAULT_CATS.indexOf(cat)>=0;
      var d = document.createElement('div'); d.className = 'cat-item';
      d.innerHTML = '<span style="flex:1">'+cat+'</span>'+(isDef?'<span class="badge badge-gold">default</span>':'<button class="btn-danger" onclick="removeCat('+ri+')">Delete</button>');
      el.appendChild(d);
    });
  });
}

function addCategory() {
  var name = prompt('New category name:');
  if (name && cats.indexOf(name) < 0) {
    cats.push(name);
    cards.forEach(function(card){ if(!(name in card.categories)) card.categories[name] = card.baseRate; });
    renderCatCols(); initSpendInputs();
  }
}

function removeCat(idx) { cats.splice(idx,1); renderCatCols(); initSpendInputs(); }

function renderPartnerMatrix() {
  var all  = getAllPartners();
  var wrap = document.getElementById('partner-matrix-wrap');
  wrap.innerHTML = ''; wrap.style.gridTemplateColumns = '1fr 1fr';

  var AL_COLOR = {
    'Star Alliance':'#9ca3af','oneworld':'#c9a84c','SkyTeam':'#06b6d4',
    'Gulf':'#8b5cf6','Independent':'#6b7280','Via Marriott':'#34d399'
  };

  function makeCol(partners, label) {
    var col = document.createElement('div');
    var hdr = document.createElement('div');
    hdr.style.cssText = 'font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:.5rem;padding-bottom:.3rem;border-bottom:1px solid var(--border)';
    hdr.textContent = label;
    col.appendChild(hdr);
    var tbl = document.createElement('table');
    tbl.className = 'partner-matrix';
    tbl.innerHTML = '<thead><tr><th>Partner</th><th>Alliance</th><th>\u20b9/pt</th></tr></thead>';
    var tbody = document.createElement('tbody');
    partners.slice().sort(function(a,b){ return a.name.localeCompare(b.name); }).forEach(function(p){
      var al = ALLIANCE[p.name] || '';
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td><span class="partner-tag '+p.type+'" style="margin:0">'+p.name+'</span></td>'+
        '<td style="font-size:.71rem;color:'+(AL_COLOR[al]||'var(--muted)')+'">'+al+'</td>'+
        '<td><input type="number" min="0" step="0.05" value="'+(pv[p.name]!==undefined?pv[p.name]:'')+
        '" placeholder="0.00" onchange="pv[\'' + p.name + '\']=parseFloat(this.value)||0"></td>';
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody); col.appendChild(tbl); wrap.appendChild(col);
  }

  makeCol(all.filter(function(p){ return p.type==='airline'; }), 'Airlines');
  makeCol(all.filter(function(p){ return p.type==='hotel'; }),   'Hotels');
}

// ── Reset ─────────────────────────────────────────────────────────────────────
function resetDashboard() {
  cats.forEach(function(cat){var el=document.getElementById('spend-'+cat);if(el){el.value='0';el.dataset.raw='0';}});
  var st=document.getElementById('spend-total-display');if(st)st.textContent='₹0';
  ['o-netval','o-netrate','o-total','o-rate','o-bcard','o-brate','o-topcat'].forEach(function(id){setOut(id,'—',true);});
  var fp=document.getElementById('o-flight-panel');if(fp)fp.innerHTML='<span class="omv zero">—</span>';
  var hp=document.getElementById('o-hotel-panel');if(hp)hp.innerHTML='<span class="omv zero">—</span>';
  document.getElementById('optimizer-results').style.display='none';
  document.getElementById('quick-results').style.display='none';
  var csr=document.getElementById('custom-split-results');if(csr)csr.style.display='none';
  document.getElementById('pct-flights').value=50;
  document.getElementById('pct-hotels').value=50;
  if(rwChart){rwChart.destroy();rwChart=null;}if(rpChart){rpChart.destroy();rpChart=null;}
  if(splitRwChart){splitRwChart.destroy();splitRwChart=null;}if(splitRpChart){splitRpChart.destroy();splitRpChart=null;}
  lastAlloc=null;lastCardTotals=null;lastPartnerTotals=null;lastTotalSpend=0;
  var pw=document.getElementById('partner-chart-wrap');if(pw)pw.style.display='none';
  var ms=document.getElementById('milestone-section');if(ms){ms.style.display='none';ms.innerHTML='';}
  var fs=document.getElementById('fee-section');if(fs){fs.style.display='none';fs.innerHTML='';}
}

function resetInputs() {
  cards=JSON.parse(JSON.stringify(DC));cats=DEFAULT_CATS.slice();pv=Object.assign({},DEFAULT_PV);
  var sel=document.getElementById('data-card-select');
  if(sel){sel.innerHTML='';cards.forEach(function(c){var o=document.createElement('option');o.value=c.id;o.textContent=c.name;sel.appendChild(o);});}
  renderInputsTab();initSpendInputs();populateTravelSelects();autoSave();
}

// ── Card management ───────────────────────────────────────────────────────────
function renderCardList() {
  var el=document.getElementById('card-list');if(!el)return;el.innerHTML='';
  if(!cards.length){
    el.innerHTML='<div style="padding:1.2rem;text-align:center;color:var(--muted);font-size:.83rem">No cards added yet. Click <strong style="color:var(--accent)">+ Add Card</strong> above to get started.</div>';
    return;
  }
  var mid=Math.ceil(cards.length/2);
  var col1=document.createElement('div'),col2=document.createElement('div');
  col1.style.cssText='flex:1;min-width:0';col2.style.cssText='flex:1;min-width:0';
  cards.forEach(function(card,i){
    var row=document.createElement('div');row.className='cat-item';
    row.innerHTML='<div style="flex:1;min-width:0"><span style="font-weight:500">'+card.name+'</span> <span style="font-size:.71rem;color:var(--muted)">'+card.currency+'</span></div>'+'<button class="btn-danger" onclick="removeCard(\''+card.id+'\')">Remove</button>';
    (i<mid?col1:col2).appendChild(row);
  });
  var wrap=document.createElement('div');
  wrap.style.cssText='display:flex;gap:0 2rem';
  wrap.appendChild(col1);wrap.appendChild(col2);
  el.appendChild(wrap);
}
function removeCard(cardId) {
  var idx=cards.findIndex(function(c){return c.id===cardId;});if(idx<0)return;
  cards.splice(idx,1);
  var sel=document.getElementById('data-card-select');if(sel){var o=sel.querySelector('option[value="'+cardId+'"]');if(o)o.remove();}
  renderInputsTab();populateTravelSelects();autoSave();
}
function openAddCardModal() {
  ['ac-name','ac-currency','ac-partners','ac-notes'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
  var s=document.getElementById('ac-status');if(s){s.textContent='';s.style.color='';}
  document.getElementById('add-card-modal').classList.remove('hidden');
}
function closeAddCardModal(){document.getElementById('add-card-modal').classList.add('hidden');}
function submitAddCard() {
  var name=(document.getElementById('ac-name').value||'').trim();
  var currency=(document.getElementById('ac-currency').value||'').trim();
  var ptxt=(document.getElementById('ac-partners').value||'').trim();
  var userNotes=(document.getElementById('ac-notes').value||'').trim();
  var status=document.getElementById('ac-status');
  if(!name||!currency){status.textContent='Card name and rewards currency are required.';status.style.color='var(--danger)';return;}
  var manualPartners=ptxt?ptxt.split(',').map(function(s){return s.trim();}).filter(Boolean).map(function(n){var cn=canonical(n);return DEFAULT_PARTNER_TYPES[cn]?{name:cn,type:DEFAULT_PARTNER_TYPES[cn]}:null;}).filter(Boolean):[];
  var co={};DEFAULT_CATS.forEach(function(cat){co[cat]=0.02;});
  var id='custom_'+Date.now();
  var nc={id:id,name:name,currency:currency,baseRate:0.02,forexMarkup:0.035,intlRate:0.02,intlTravelRate:0.02,categories:co,exclusions:[],dex:[],partners:manualPartners.slice(),notes:userNotes||'Earn rates pending — click "Get T&Cs for Added Cards".',milestones:'N/A'};
  cards.push(nc);
  var sel=document.getElementById('data-card-select');if(sel){var o=document.createElement('option');o.value=id;o.textContent=name;sel.appendChild(o);}
  status.textContent='Card added ✓ — click "Get T&Cs for Added Cards" to populate earn rates.';
  status.style.color='var(--success)';
  renderInputsTab();populateTravelSelects();autoSave();
  setTimeout(closeAddCardModal,2000);
}

// ── Card T&C helpers ──────────────────────────────────────────────────────────
function applyCardData(card, data) {
  if (data.id && typeof data.id === 'string') card.id = data.id;
  if (typeof data.baseRate === 'number') card.baseRate = data.baseRate;
  if (typeof data.forexMarkup === 'number') card.forexMarkup = data.forexMarkup;
  if (typeof data.intlRate === 'number') card.intlRate = data.intlRate;
  if (typeof data.intlTravelRate === 'number') card.intlTravelRate = data.intlTravelRate;
  if (data.categories) {
    DEFAULT_CATS.forEach(function(cat) {
      if (typeof data.categories[cat] === 'number') card.categories[cat] = data.categories[cat];
    });
  }
  if (Array.isArray(data.exclusions)) {
    card.exclusions = data.exclusions.filter(function(c) { return DEFAULT_CATS.indexOf(c) >= 0; });
    card.dex = card.exclusions.slice();
  }
  if (Array.isArray(data.partners)) {
    card.partners = data.partners.map(function(n) {
      var cn = canonical(n);
      return DEFAULT_PARTNER_TYPES[cn] ? {name: cn, type: DEFAULT_PARTNER_TYPES[cn]} : null;
    }).filter(Boolean);
  }
  if (data.notes) card.notes = data.notes;
  if (data.milestones) card.milestones = data.milestones;
  if (Array.isArray(data.milestoneBonus)) card.milestoneBonus = JSON.parse(JSON.stringify(data.milestoneBonus));
  if (typeof data.annualFee === 'number') card.annualFee = data.annualFee;
  if (data.feeNote) card.feeNote = data.feeNote;
  if (Array.isArray(data.renewalBenefits)) card.renewalBenefits = JSON.parse(JSON.stringify(data.renewalBenefits));
}

function calcRenewalVal(card) {
  if (!card.renewalBenefits || !card.renewalBenefits.length) return 0;
  var total = 0;
  card.renewalBenefits.forEach(function(rb) {
    total += (rb.bonusValue || 0);
    if (rb.bonusPts && rb.partner) {
      var cn = canonical(rb.partner);
      total += rb.bonusPts * (pv[cn] || 0) * transferRatio(card.id, cn);
    }
  });
  return total;
}

function findBuiltin(cardName, builtins) {
  var n = cardName.toLowerCase().trim();
  // Exact name match first
  var exact = builtins.find(function(b) {
    return b.names.some(function(bn) { return bn.toLowerCase() === n; });
  });
  if (exact) return exact;
  // Relaxed: either name contains the other (min 7 chars to avoid false matches)
  return builtins.find(function(b) {
    return b.names.some(function(bn) {
      var bl = bn.toLowerCase();
      return (bl.length >= 7 && n.includes(bl)) || (n.length >= 7 && bl.includes(n));
    });
  }) || null;
}

async function fetchAllTCs() {
  if (!cards.length) { alert('No cards added. Add cards first.'); return; }
  var btn = document.getElementById('btn-fetch-tcs');
  var statusEl = document.getElementById('tc-fetch-status');
  if (btn) { btn.disabled = true; btn.textContent = 'Fetching…'; }
  if (statusEl) { statusEl.textContent = 'Checking local T&C database…'; statusEl.style.color = 'var(--accent)'; }

  // 1. Load builtin DB
  var builtins = [];
  try {
    var r = await fetch('cc-builtin.json');
    if (r.ok) builtins = (await r.json()).cards || [];
  } catch(e) { /* file missing or offline — continue to Gemini */ }

  // 2. Apply builtins for matching cards
  var fromBuiltin = 0, remaining = [];
  cards.forEach(function(card) {
    var match = findBuiltin(card.name, builtins);
    if (match) { applyCardData(card, match); fromBuiltin++; }
    else remaining.push(card);
  });

  // 3. Call Gemini only for cards not in the local DB
  var fromGemini = 0, missed = [];
  if (remaining.length > 0) {
    var apiKey = getApiKey();
    if (!apiKey) {
      missed = remaining.map(function(c) { return c.name; });
    } else {
      try {
        var validPartners = Object.keys(DEFAULT_PARTNER_TYPES);
        var cardList = remaining.map(function(c) { return '"' + c.name + '" (currency: ' + c.currency + ')'; }).join(', ');
        var prompt = 'You are a credit card data assistant for Indian credit cards. Provide earn rates, exclusions and transfer partners for these cards from your knowledge.\n\nCards: ' + cardList + '\n\nIMPORTANT: For each category use the HIGHEST earn rate actually achievable, including:\n- Portal/accelerated rates (e.g. HSBC Travel with Points portal: up to 12× base on hotels/flights; ICICI iShop portal: up to 12× on hotels, 6× on flights; Tata Neu NeuPass: 5% on Tata brands)\n- Preferred destination / on-brand multipliers (e.g. IndusInd Avios: 6 Avios/Rs.200 = 0.03 at preferred partner POS; BOBCard Etihad: 6 miles/Rs.100 = 0.06 on direct etihad.com)\n- All rates as decimal fractions (2% = 0.02)\n\nValid partner names (use ONLY these exact strings): ' + validPartners.join(', ') + '\n\nRespond with ONLY valid JSON — no markdown fences, no comments:\n{"<CardName>":{"baseRate":0.02,"forexMarkup":0.035,"intlRate":0.02,"intlTravelRate":0.02,"categories":{"Flights":0.02,"Hotels":0.02,"Dining":0.02,"Shopping":0.02,"Groceries":0.02,"Entertainment":0.02,"Healthcare":0.02,"Education":0.02,"Utilities":0.02,"Insurance":0.02,"Fuel":0.0,"Rent":0.0,"Government":0.0,"Jewellery":0.0,"Wallet Loads":0.0,"International Transactions":0.02},"exclusions":["Fuel","Rent"],"partners":["Singapore Airlines (KrisFlyer)"],"notes":"2-3 sentence T&C summary","milestones":"Milestone benefits or N/A"}}\nRules: exclusions = categories with 0 earn; set those to 0.0 in categories too. Only use partner names from the valid list. forexMarkup=0.0 for zero-forex cards.';
        var resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + encodeURIComponent(apiKey), {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({contents: [{parts: [{text: prompt}]}], generationConfig: {maxOutputTokens: 8192, temperature: 0.1}})
        });
        var data = await resp.json();
        if (!resp.ok) { throw new Error((data.error && data.error.message) || 'API error ' + resp.status); }
        var text = ((data.candidates || [])[0] || {content: {parts: [{text: ''}]}}).content.parts.map(function(p) { return p.text || ''; }).join('').trim();
        text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
        var parsed = JSON.parse(text);
        remaining.forEach(function(card) {
          var d = parsed[card.name];
          if (d) { try { applyCardData(card, d); fromGemini++; } catch(e) { missed.push(card.name); } }
          else { missed.push(card.name); }
        });
      } catch(e) {
        console.warn('fetchAllTCs Gemini:', e);
        missed = remaining.map(function(c) { return c.name; });
        var errNote = ' (Gemini: ' + (e.message || 'error') + ')';
        if (statusEl) { statusEl.textContent = 'Partial update' + errNote; statusEl.style.color = 'var(--danger)'; }
      }
    }
  }

  autoSave();
  renderInputsTab();
  if (document.getElementById('data-card-select').value) renderCardDetail();
  // Refresh optimizer results if it has been run and there is spend data
  if (lastAlloc && cats.some(function(cat){ return getRawSpend(cat) > 0; })) {
    try { runOptimizer(); } catch(e) { console.warn('post-TC optimizer refresh:', e); }
  }

  var parts = [];
  if (fromBuiltin) parts.push(fromBuiltin + ' from local DB');
  if (fromGemini) parts.push(fromGemini + ' from Gemini');
  var total = fromBuiltin + fromGemini;
  var msg = 'T&Cs applied for ' + total + '/' + cards.length + ' card(s)' + (parts.length ? ' (' + parts.join(', ') + ')' : '');
  if (missed.length) msg += ' — not found: ' + missed.join(', ');
  if (statusEl) { statusEl.textContent = msg; statusEl.style.color = missed.length && !total ? 'var(--danger)' : 'var(--success)'; }
  showStatus('T&Cs updated ✓', 'ok');
  if (btn) { btn.disabled = false; btn.textContent = '⟳ Get T&Cs for Added Cards'; }
}

// ── API Key management ────────────────────────────────────────────
function getApiKey(){return localStorage.getItem('ccanalyzer_apikey')||'';}
function openApiKeyModal(){
  var inp=document.getElementById('apikey-input');
  var lbl=document.getElementById('apikey-status-lbl');
  var existing=getApiKey();
  if(inp){inp.value='';inp.placeholder=existing?'Enter new key to replace existing…':'AIza...';}
  if(lbl){lbl.textContent=existing?'✓ Key saved ('+existing.slice(-4)+' …last 4 chars)':'No key saved yet.';lbl.style.color=existing?'var(--success)':'var(--muted)';}
  document.getElementById('apikey-modal').classList.remove('hidden');
}
function closeApiKeyModal(){document.getElementById('apikey-modal').classList.add('hidden');}
function saveApiKey(){
  var val=(document.getElementById('apikey-input').value||'').trim();
  if(!val){
    var lbl=document.getElementById('apikey-status-lbl');
    if(lbl){lbl.textContent='Please enter your API key.';lbl.style.color='var(--danger)';}
    return;
  }
  localStorage.setItem('ccanalyzer_apikey',val);
  document.getElementById('apikey-input').value='';
  closeApiKeyModal();
  showStatus('API key saved ✓','ok');
}

// ── Master Reset ────────────────────────────────────────────
function masterReset(){
  if(!cards.length){alert('No cards to remove.');return;}
  if(!confirm('Remove all '+cards.length+' credit card(s)? This cannot be undone.'))return;
  cards=[];
  var sel=document.getElementById('data-card-select');if(sel)sel.innerHTML='';
  renderInputsTab();populateTravelSelects();autoSave();
}
// ── Feature 2: Custom Split Redemption ────────────────────────────────────────
function runCustomSplit() {
  if(!lastAlloc){alert('Run the Annual Spend Optimizer first (Feature 1).');return;}
  var pctF=(parseFloat(document.getElementById('pct-flights').value)||50)/100;
  var pctH=(parseFloat(document.getElementById('pct-hotels').value)||50)/100;
  var defAirline=document.getElementById('default-airline').value;
  var defHotel=document.getElementById('default-hotel').value;
  var alloc=lastAlloc,cardTotals=lastCardTotals,partnerTotals=lastPartnerTotals,totalSpend=lastTotalSpend;
  var totalPts=0;cats.forEach(function(cat){totalPts+=alloc[cat]?alloc[cat].pts||0:0;});
  function calcSplitRedeem(preferredPartner,pct){
    var pName=canonical(preferredPartner),eligPts=0,eligVal=0;
    cats.forEach(function(cat){var a=alloc[cat];if(!a||!a.card||!a.pts)return;var ok=(a.card.partners||[]).some(function(p){return canonical(p.name)===pName&&p.type!=='cashback';});if(ok){eligPts+=a.pts;eligVal+=a.pts*partnerRupeeVal(a.card.id,pName);}});
    var ptsNeeded=totalPts*pct,actualPts=Math.min(ptsNeeded,eligPts),rsVal=0,note='';
    if(eligPts===0){note=preferredPartner.split(' (')[0].split('/')[0].trim()+' not available from allocated cards';}
    else{var rpp=eligPts>0?eligVal/eligPts:0;rsVal=actualPts*rpp;if(actualPts<ptsNeeded){var cp=totalPts>0?Math.round(eligPts/totalPts*100):0;note='Travel redemption split not met — only '+cp+'% of pts can reach '+preferredPartner.split(' (')[0].split('/')[0].trim();}}
    return{rsVal:rsVal,note:note};
  }
  var airlineName=defAirline.split(' (')[0],hotelName=defHotel.split('/')[0].split(' (')[0].trim();
  var fr=calcSplitRedeem(defAirline,pctF),hr=calcSplitRedeem(defHotel,pctH);
  var frR=totalSpend>0&&fr.rsVal>0?(fr.rsVal/totalSpend*100).toFixed(2)+'%':'—';
  var hrR=totalSpend>0&&hr.rsVal>0?(hr.rsVal/totalSpend*100).toFixed(2)+'%':'—';
  var fp=document.getElementById('o-flight-panel');if(fp)fp.innerHTML='<div class="omv'+(fr.rsVal===0?' zero':'')+'" style="font-size:.84rem">'+fmt(fr.rsVal)+'</div><div style="font-size:.72rem;color:var(--muted);margin-top:.1rem">'+(pctF*100).toFixed(0)+'% via '+airlineName+' · '+frR+' of total spend</div>'+(fr.note?'<div style="font-size:.7rem;color:var(--danger);margin-top:.15rem">⚠ '+fr.note+'</div>':'');
  var hp=document.getElementById('o-hotel-panel');if(hp)hp.innerHTML='<div class="omv'+(hr.rsVal===0?' zero':'')+'" style="font-size:.84rem">'+fmt(hr.rsVal)+'</div><div style="font-size:.72rem;color:var(--muted);margin-top:.1rem">'+(pctH*100).toFixed(0)+'% via '+hotelName+' · '+hrR+' of total spend</div>'+(hr.note?'<div style="font-size:.7rem;color:var(--danger);margin-top:.15rem">⚠ '+hr.note+'</div>':'');
  var splitCardTotals={},splitPartnerTotals={},airlineCanon=canonical(defAirline),hotelCanon=canonical(defHotel);
  cats.forEach(function(cat){var a=alloc[cat];if(!a||!a.card||!a.pts)return;var cid=a.card.id,pts=a.pts;var canA=(a.card.partners||[]).some(function(p){return canonical(p.name)===airlineCanon&&p.type!=='cashback';});var canH=(a.card.partners||[]).some(function(p){return canonical(p.name)===hotelCanon&&p.type!=='cashback';});var fVal=canA?pts*pctF*partnerRupeeVal(cid,defAirline):0;var hVal=canH?pts*pctH*partnerRupeeVal(cid,defHotel):0;var uVal=(!canA?pts*pctF*(pts>0?a.value/pts:0):0)+(!canH?pts*pctH*(pts>0?a.value/pts:0):0);var tot=fVal+hVal+uVal;if(tot>0)splitCardTotals[cid]=(splitCardTotals[cid]||0)+tot;if(fVal>0)splitPartnerTotals[airlineName]=(splitPartnerTotals[airlineName]||0)+fVal;if(hVal>0)splitPartnerTotals[hotelName]=(splitPartnerTotals[hotelName]||0)+hVal;if(uVal>0)splitPartnerTotals['Other']=(splitPartnerTotals['Other']||0)+uVal;});
  var cc=['#c9a84c','#8b5cf6','#06b6d4','#34d399','#f87171','#f59e0b','#ec4899','#60a5fa','#a3e635','#fb923c'];
  function mkSC(labels,values,colors){return{type:'doughnut',data:{labels:labels,datasets:[{data:values,backgroundColor:colors,borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color:'#8888a0',font:{family:'DM Sans',size:10},boxWidth:10,generateLabels:function(chart){return chart.data.labels.map(function(lbl,i){var v=chart.data.datasets[0].data[i];var disp=v>=100000?'₹'+(v/100000).toFixed(1)+'L':'₹'+v.toLocaleString('en-IN');return{text:lbl+'  '+disp,fillStyle:chart.data.datasets[0].backgroundColor[i],strokeStyle:'transparent',lineWidth:0,index:i};});}}},tooltip:{callbacks:{label:function(ctx){return ' '+ctx.label+': ₹'+ctx.raw.toLocaleString('en-IN');}}}}}};}
  var cd=Object.entries(splitCardTotals).filter(function(e){return e[1]>0;}).sort(function(a,b){return b[1]-a[1];});
  var src=document.getElementById('split-rewards-chart');if(src&&cd.length){if(splitRwChart)splitRwChart.destroy();splitRwChart=new Chart(src,mkSC(cd.map(function(e){return(cards.find(function(c){return c.id===e[0];})||{name:e[0]}).name.split(' ').slice(-2).join(' ');}),cd.map(function(e){return Math.round(e[1]);}),cc));}
  var pd=Object.entries(splitPartnerTotals).filter(function(e){return e[1]>0;}).sort(function(a,b){return b[1]-a[1];});
  var spc=document.getElementById('split-partner-chart');if(spc&&pd.length){if(splitRpChart)splitRpChart.destroy();splitRpChart=new Chart(spc,mkSC(pd.map(function(e){return e[0].split(' (')[0];}),pd.map(function(e){return Math.round(e[1]);}),cc.slice().reverse()));}
  document.getElementById('custom-split-results').style.display='block';
}
