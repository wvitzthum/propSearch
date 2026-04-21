const fs = require('fs');
const path = require('path');

const leads = [
  {
    url: 'https://www.winkworth.co.uk/properties/sales/wyndham-street-marylebone-w1h/MLB240067',
    source: 'USER_SUBMISSION',
    source_name: 'Winkworth',
    address: 'Wyndham Street, Marylebone, London, W1H',
    area: 'Marylebone (W1)',
    list_price: 670000,
    realistic_price: 670000,
    bedrooms: 2,
    bathrooms: null,
    sqft: null,
    image_url: 'https://www.winkworth.co.uk/getmedia/ae0a026f-bb20-4744-9847-a4a6ea6cfd36/MLB240067_06.jpg',
    gallery: [
      'https://www.winkworth.co.uk/getmedia/ae0a026f-bb20-4744-9847-a4a6ea6cfd36/MLB240067_06.jpg',
      'https://www.winkworth.co.uk/getmedia/65f24f5b-53ba-498d-8e59-0416784820b5/MLB240067_10.jpg',
      'https://www.winkworth.co.uk/getmedia/ac8a72a5-b2d3-498c-a267-4b668ad8561c/MLB240067_11.jpg',
      'https://www.winkworth.co.uk/getmedia/8c5e22cb-ada5-4562-a2cd-75bca35c5180/MLB240067_09.jpg',
      'https://www.winkworth.co.uk/getmedia/2ce33e52-d48f-42cd-b800-38273a2937ad/MLB240067_07.jpg',
      'https://www.winkworth.co.uk/getmedia/6901eeba-5bf3-4bf7-a9cb-4e25b038b4fd/MLB240067_04.jpg',
      'https://www.winkworth.co.uk/getmedia/4e7838ed-a791-40ba-81f8-796b94387d5c/MLB240067_05.jpg',
      'https://www.winkworth.co.uk/getmedia/7836a5e7-1912-4650-8192-4af60357e5ef/MLB240067_01.jpg',
      'https://www.winkworth.co.uk/getmedia/63aad4ba-36c7-43b8-93bc-d5130f34384c/MLB240067_02.jpg',
      'https://www.winkworth.co.uk/getmedia/b34891cf-c51c-491c-acdc-96581864f5d7/MLB240067_03.jpg'
    ],
    tenure: null,
    epc: null,
    analyst_notes: 'User-submitted lead — guardrails suspended. Winkworth: 2 bed Wyndham St W1H at 670,000. sqft/tenure/EPC/enure unknown — needs enrichment. Outside target zones but imported per guardrails suspension protocol.'
  },
  {
    url: 'https://www.knightfrank.co.uk/properties/residential/for-sale/queensway-london-w2/hpe012678416',
    source: 'USER_SUBMISSION',
    source_name: 'Knight Frank',
    address: 'Queensway, London, W2',
    area: 'Bayswater (W2)',
    list_price: 585000,
    realistic_price: 585000,
    bedrooms: 1,
    bathrooms: null,
    sqft: null,
    image_url: null,
    gallery: [],
    tenure: null,
    epc: null,
    analyst_notes: 'User-submitted lead — guardrails suspended. Knight Frank: 1 bed Queensway W2 at 585,000. Site blocked scraping — bedrooms from title only. Needs enrichment for sqft tenure EPC floor. Area W2 Bayswater is target zone.'
  },
  {
    url: 'https://www.hanover-residential.co.uk/property/aberdeen-court-maida-vale-w9-3/',
    source: 'USER_SUBMISSION',
    source_name: 'Hanover Residential',
    address: 'Aberdeen Court, Maida Vale, London, W9',
    area: 'Maida Vale (W9)',
    list_price: 700000,
    realistic_price: 700000,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 790,
    epc: 'D',
    tenure: 'Leasehold',
    lease_years_remaining: 82,
    service_charge: 10800,
    council_tax_band: 'F',
    floor_level: 'Fourth floor',
    image_url: 'https://assets.reapit.net/hnv/live/pictures/HNV/20/HNV200148_01.jpg',
    gallery: [
      'https://assets.reapit.net/hnv/live/pictures/HNV/20/HNV200148_01.jpg',
      'https://assets.reapit.net/hnv/live/pictures/HNV/20/HNV200148_02.jpg',
      'https://assets.reapit.net/hnv/live/pictures/HNV/20/HNV200148_03.jpg',
      'https://assets.reapit.net/hnv/live/pictures/HNV/20/HNV200148_04.jpg',
      'https://assets.reapit.net/hnv/live/pictures/HNV/20/HNV200148_05.jpg',
      'https://assets.reapit.net/hnv/live/pictures/HNV/20/HNV200148_06.jpg',
      'https://assets.reapit.net/hnv/live/pictures/HNV/20/HNV200148_07.jpg',
      'https://assets.reapit.net/hnv/live/pictures/HNV/20/HNV200148_08.jpg'
    ],
    analyst_notes: 'User-submitted lead — guardrails suspended. Full data from Hanover Residential: 2 bed 2 bath 790 sqft 4th floor Leasehold 82yr SC 10800/pa CT Band F EPC D. W9 Maida Vale adjacent to target zone. sqft 790 meets 600 minimum. Lease 82yr below 90yr threshold but guardrails suspended.'
  },
  {
    url: 'https://www.foxtons.co.uk/properties-for-sale/w9/sjwd0070189',
    source: 'USER_SUBMISSION',
    source_name: 'Foxtons',
    address: 'Warwick Avenue, Little Venice, London, W9',
    area: 'Little Venice (W9)',
    list_price: 675000,
    realistic_price: 675000,
    bedrooms: 2,
    bathrooms: 1,
    sqft: null,
    floor_level: 'Third floor',
    image_url: 'https://assets.foxtons.co.uk/w/1280/1596989322/sjwd0070189-1.jpg',
    gallery: [
      'https://assets.foxtons.co.uk/w/1280/1596989322/sjwd0070189-1.jpg',
      'https://assets.foxtons.co.uk/w/1280/1775060396/sjwd0070189-60.jpg',
      'https://assets.foxtons.co.uk/w/1280/1774892233/sjwd0070189-51.jpg',
      'https://assets.foxtons.co.uk/w/1280/1774892243/sjwd0070189-52.jpg',
      'https://assets.foxtons.co.uk/w/1280/1774892253/sjwd0070189-53.jpg',
      'https://assets.foxtons.co.uk/w/1280/1774892274/sjwd0070189-55.jpg',
      'https://assets.foxtons.co.uk/w/1280/1774892284/sjwd0070189-56.jpg',
      'https://assets.foxtons.co.uk/w/1280/1774892264/sjwd0070189-54.jpg',
      'https://assets.foxtons.co.uk/w/1280/1774892294/sjwd0070189-57.jpg',
      'https://assets.foxtons.co.uk/w/1280/1774892304/sjwd0070189-58.jpg'
    ],
    tenure: null,
    epc: null,
    analyst_notes: 'User-submitted lead — guardrails suspended. Foxtons: 2 bed 1 bath 3rd floor 675,000 Warwick Ave W9. sqft tenure EPC SC unknown — needs enrichment. W9 Little Venice adjacent to Bayswater target zone. Prime Warwick Ave address near canal.'
  },
  {
    url: 'https://www.yopa.co.uk/properties/details/485313',
    source: 'USER_SUBMISSION',
    source_name: 'Yopa',
    address: 'Warwick Avenue, London, W9',
    area: 'Little Venice (W9)',
    list_price: 650000,
    realistic_price: 650000,
    bedrooms: 2,
    bathrooms: null,
    sqft: null,
    epc: 'B',
    tenure: 'Leasehold',
    lease_years_remaining: 86,
    floor_level: 'Top floor',
    image_url: 'https://cdn.yopa.co.uk/properties/485313/c9d8118bfed56af176f5e8f3f959a018c32e0ba4_thmb_md.jpg',
    gallery: [
      'https://cdn.yopa.co.uk/properties/485313/c9d8118bfed56af176f5e8f3f959a018c32e0ba4_thmb_md.jpg',
      'https://cdn.yopa.co.uk/properties/485313/dd44152de6ace8e5d80e603d164e6515c22bc7a5_thmb_md.jpg',
      'https://cdn.yopa.co.uk/properties/485313/5b13c36854406a9e311edfd63676626e01657364_thmb_md.jpg',
      'https://cdn.yopa.co.uk/properties/485313/b950577efbe5a1ec713e1bc43bbf79e39be0362a_thmb_md.jpg',
      'https://cdn.yopa.co.uk/properties/485313/d2ef7d97744c8feed40839da674b3bd50f34404d_thmb_md.jpg',
      'https://cdn.yopa.co.uk/properties/485313/1c4c3cae1c28f19b3b46f5fbfc93cb89e5726502_thmb_md.jpg',
      'https://cdn.yopa.co.uk/properties/485313/aa4f1756ebcd1f6dde2d12b1a909d7a3cae090f5_thmb_md.jpg',
      'https://cdn.yopa.co.uk/properties/485313/ab5aa48ee6cf813616c2934b7fcbff1200e366af_thmb_md.jpg'
    ],
    analyst_notes: 'User-submitted lead — guardrails suspended. Yopa: 2 bed Top floor 86yr lease EPC B chain free Warwick Ave W9. sqft est ~60 sqm (~646 sqft) needs floorplan verification. Lease 86yr below 90yr but guardrails suspended. Needs SC council tax.'
  },
  {
    url: 'https://www.marshandparsons.co.uk/properties-for-sale/london/property/CSG211027/warwick-avenue/',
    source: 'USER_SUBMISSION',
    source_name: 'Mars & Parsons',
    address: 'Warwick Avenue, London, W9',
    area: 'Little Venice (W9)',
    list_price: null,
    realistic_price: null,
    bedrooms: null,
    bathrooms: null,
    sqft: null,
    image_url: null,
    gallery: [],
    tenure: null,
    epc: null,
    analyst_notes: 'User-submitted lead — guardrails suspended. Site blocked by Cloudflare — no data extracted. Needs enrichment via FlareSolverr or Rightmove/Zoopla cross-reference. Warwick Avenue W9 is target area.'
  },
  {
    url: 'https://www.chestertons.co.uk/properties/20311641/sales/VEN250013',
    source: 'USER_SUBMISSION',
    source_name: 'Chestertons',
    address: 'Warwick Avenue, London, W9',
    area: 'Little Venice (W9)',
    list_price: null,
    realistic_price: null,
    bedrooms: null,
    bathrooms: null,
    sqft: null,
    image_url: null,
    gallery: [],
    tenure: null,
    epc: null,
    analyst_notes: 'User-submitted lead — guardrails suspended. Site blocked by Cloudflare — no data extracted. Needs enrichment via FlareSolverr or Rightmove/Zoopla cross-reference. Warwick Avenue W9 is target area.'
  }
];

const IMPORT_DIR = path.join(__dirname, '../data/import');
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const filename = 'user_submissions_' + ts + '.json';
const filepath = path.join(IMPORT_DIR, filename);
fs.writeFileSync(filepath, JSON.stringify(leads, null, 2));
console.log('Written: ' + filepath);
console.log('Records: ' + leads.length);
for (const l of leads) {
  const price = l.list_price ? 'GBP' + l.list_price.toLocaleString() : 'TBC';
  const bed = l.bedrooms ? l.bedrooms + ' bed' : '? bed';
  console.log('  - ' + l.address + ' | ' + price + ' | ' + bed);
}
