const BASE_URL = 'http://localhost:3000';

async function testVerification() {
  try {
    console.log('Testing verification system...');

    // Test signup
    const signupResponse = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `test${Date.now()}@example.com`,
        password: 'TestPassword123',
        name: 'Test User'
      })
    });

    const signupData = await signupResponse.json();
    console.log('Signup response:', signupData);

    if (!signupResponse.ok) {
      console.log('Signup failed');
      return;
    }

    // Extract email from signup response or use the one we sent
    const testEmail = signupData.email || `test${Date.now()}@example.com`;

    // Test verification
    const verifyResponse = await fetch(`${BASE_URL}/api/auth/verify-email?email=${encodeURIComponent(testEmail)}`, {
      method: 'GET',
    });

    console.log('Verification response status:', verifyResponse.status);
    console.log('Verification redirect location:', verifyResponse.headers.get('location'));

  } catch (err) {
    console.error('Test error:', err);
  }
}

testVerification();