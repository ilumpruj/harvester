// Helper script to seed your collection with Sortlist directory pages
// These pages contain MANY company links each!

console.log('🌱 Seeding collection with Sortlist directory pages...');

const collectionPages = [
  // Main category pages
  'https://www.sortlist.com/agencies',
  'https://www.sortlist.com/marketing-agencies',
  'https://www.sortlist.com/web-agencies',
  'https://www.sortlist.com/advertising-agencies',
  'https://www.sortlist.com/design-agencies',
  'https://www.sortlist.com/digital-agencies',
  'https://www.sortlist.com/branding-agencies',
  'https://www.sortlist.com/seo-agencies',
  'https://www.sortlist.com/social-media-agencies',
  
  // Location-based pages
  'https://www.sortlist.com/agencies/london',
  'https://www.sortlist.com/agencies/new-york',
  'https://www.sortlist.com/agencies/paris',
  'https://www.sortlist.com/agencies/berlin',
  'https://www.sortlist.com/agencies/amsterdam',
  
  // Pagination examples
  'https://www.sortlist.com/agencies?page=2',
  'https://www.sortlist.com/agencies?page=3',
  'https://www.sortlist.com/marketing-agencies?page=2',
  'https://www.sortlist.com/web-agencies?page=2'
];

// Function to add these to your collection
function seedCollectionPages() {
  const seedData = collectionPages.map(url => ({
    url: url,
    name: `Collection: ${url.split('/').pop()}`,
    extracted_at: new Date().toISOString(),
    source: 'seed-collection'
  }));
  
  // Send to background script
  chrome.runtime.sendMessage({
    action: 'urlsExtracted',
    data: {
      companies: seedData,
      all: [],
      pageInfo: {
        url: 'seed-collection-pages',
        title: 'Seed Collection Pages',
        timestamp: new Date().toISOString()
      }
    },
    source: 'seed-script'
  }, response => {
    if (chrome.runtime.lastError) {
      console.error('❌ Failed to seed:', chrome.runtime.lastError);
    } else {
      console.log('✅ Seeded collection with', collectionPages.length, 'directory pages!');
      console.log('🎯 These pages contain 20-50 companies each!');
      console.log('🤖 Start auto-browse to visit these and collect hundreds of companies!');
    }
  });
}

// Make it available in console
window.seedCollection = seedCollectionPages;

console.log('💡 Run seedCollection() to add Sortlist directory pages to your collection!');
console.log('📊 Each directory page contains 20-50 company links!');