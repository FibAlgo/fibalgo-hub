// Test Twitter post endpoint locally

const CRON_SECRET = 'fibalgo-cron-secret-2026';

async function testTwitterPost() {
  console.log('Testing Twitter post endpoint...\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/cron/twitter-post', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`
      }
    });
    
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testTwitterPost();
