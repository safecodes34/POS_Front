// Test script to verify backend connection from browser console
// Copy and paste this into the browser console on your other device

async function testBackendConnection() {
  const networkIP = window.location.hostname;
  const backendUrl = `https://${networkIP}:4001`;
  
  console.log('🧪 Testing Backend Connection');
  console.log('═══════════════════════════════════════');
  console.log('Network IP:', networkIP);
  console.log('Backend URL:', backendUrl);
  console.log('');
  
  // Test 1: Health endpoint
  console.log('Test 1: Health endpoint...');
  try {
    const response = await fetch(`${backendUrl}/api/health`, {
      method: 'GET',
      mode: 'cors',
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ SUCCESS');
      console.log('Response:', data);
    } else {
      console.log('❌ FAILED');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      const text = await response.text();
      console.log('Response:', text);
    }
  } catch (error) {
    console.log('❌ ERROR');
    console.log('Error Type:', error.name);
    console.log('Error Message:', error.message);
    console.log('Full Error:', error);
  }
  
  console.log('');
  
  // Test 2: Check CORS headers
  console.log('Test 2: CORS preflight (OPTIONS)...');
  try {
    const response = await fetch(`${backendUrl}/api/health`, {
      method: 'OPTIONS',
      mode: 'cors',
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'GET'
      }
    });
    
    console.log('Status:', response.status);
    console.log('CORS Headers:');
    response.headers.forEach((value, key) => {
      if (key.toLowerCase().includes('access-control')) {
        console.log(`  ${key}: ${value}`);
      }
    });
  } catch (error) {
    console.log('❌ ERROR');
    console.log('Error:', error.message);
  }
  
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('If Test 1 failed, check:');
  console.log('1. Backend is running on development machine');
  console.log('2. Both devices are on same network');
  console.log('3. SSL certificate was accepted');
  console.log('4. Windows Firewall allows port 4001');
  console.log('5. Check backend window for CORS logs');
}

// Run the test
testBackendConnection();







