// Backend API Test Script
const baseUrl = 'http://localhost:5000';

// Helper function to make requests
async function request(method, path, body = null, cookies = '') {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (cookies) {
    headers['Cookie'] = cookies;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${baseUrl}${path}`, options);
  const setCookie = response.headers.get('set-cookie');
  const data = await response.json().catch(() => null);

  return {
    status: response.status,
    data,
    cookies: setCookie || cookies,
  };
}

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

function test(name, condition, message = '') {
  const passed = Boolean(condition);
  results.tests.push({ name, passed, message });
  if (passed) {
    results.passed++;
    console.log(`✅ PASS: ${name}`);
  } else {
    results.failed++;
    console.log(`❌ FAIL: ${name}${message ? ' - ' + message : ''}`);
  }
}

async function runTests() {
  console.log('\n=== Backend API Tests ===\n');

  // Generate unique email for testing
  const timestamp = Date.now();
  const testEmail = `test${timestamp}@example.com`;
  const adminEmail = `admin${timestamp}@example.com`;
  let userCookies = '';
  let adminCookies = '';

  // Test 1: User Registration
  console.log('\n--- Test 1: User Registration ---');
  const regResult = await request('POST', '/api/auth/register', {
    email: testEmail,
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
  });
  test('Registration returns 200', regResult.status === 200, `Got ${regResult.status}`);
  test('Registration returns user data', regResult.data?.user?.email === testEmail);
  test('Registration sets session cookie', regResult.cookies?.includes('connect.sid'));
  userCookies = regResult.cookies || '';

  // Test 2: Get Current User (should work with session)
  console.log('\n--- Test 2: Get Current User ---');
  const userResult = await request('GET', '/api/auth/user', null, userCookies);
  test('Get user returns 200', userResult.status === 200);
  test('Get user returns correct email', userResult.data?.email === testEmail);
  test('User is not admin by default', userResult.data?.isAdmin === false);

  // Test 3: Logout
  console.log('\n--- Test 3: Logout ---');
  const logoutResult = await request('POST', '/api/auth/logout', null, userCookies);
  test('Logout returns 200', logoutResult.status === 200);

  // Test 4: Login with credentials
  console.log('\n--- Test 4: Login ---');
  const loginResult = await request('POST', '/api/auth/login', {
    email: testEmail,
    password: 'password123',
  });
  test('Login returns 200', loginResult.status === 200);
  test('Login returns user data', loginResult.data?.user?.email === testEmail);
  test('Login sets session cookie', loginResult.cookies?.includes('connect.sid'));
  userCookies = loginResult.cookies || '';

  // Test 5: Login with wrong password
  console.log('\n--- Test 5: Login with Wrong Password ---');
  const wrongPwResult = await request('POST', '/api/auth/login', {
    email: testEmail,
    password: 'wrongpassword',
  });
  test('Wrong password returns 401', wrongPwResult.status === 401);

  // Test 6: Access protected route without auth
  console.log('\n--- Test 6: Protected Route Without Auth ---');
  const unauthedResult = await request('GET', '/api/conversations');
  test('Unauthed request returns 401', unauthedResult.status === 401);

  // Test 7: Create conversation (should auto-create on first message)
  console.log('\n--- Test 7: Chat Message (Creates Conversation) ---');
  const chatResult = await request('POST', '/api/chat/message', {
    question: 'What is ContractPodAI?',
  }, userCookies);
  test('Chat message returns 200', chatResult.status === 200);
  test('Chat returns conversation ID', Boolean(chatResult.data?.conversationId));
  const conversationId = chatResult.data?.conversationId;

  // Test 8: Get conversations
  console.log('\n--- Test 8: Get Conversations ---');
  const convsResult = await request('GET', '/api/conversations', null, userCookies);
  test('Get conversations returns 200', convsResult.status === 200);
  test('Conversations list is array', Array.isArray(convsResult.data));
  test('Has at least one conversation', convsResult.data?.length >= 1);

  // Test 9: Get conversation messages
  console.log('\n--- Test 9: Get Conversation Messages ---');
  if (conversationId) {
    const msgsResult = await request('GET', `/api/conversations/${conversationId}/messages`, null, userCookies);
    test('Get messages returns 200', msgsResult.status === 200);
    test('Messages list is array', Array.isArray(msgsResult.data));
  }

  // Test 10: Test conversation limit (create 5 conversations)
  console.log('\n--- Test 10: Conversation Limit (5 max) ---');
  for (let i = 2; i <= 5; i++) {
    await request('POST', '/api/chat/message', {
      question: `Test question ${i}`,
    }, userCookies);
  }
  const sixthConv = await request('POST', '/api/chat/message', {
    question: 'This should fail - 6th conversation',
  }, userCookies);
  test('6th conversation is rejected', sixthConv.status === 400);
  test('Error mentions limit', sixthConv.data?.error === 'conversation_limit_reached');

  // Test 11: Delete a conversation
  console.log('\n--- Test 11: Delete Conversation ---');
  if (conversationId) {
    const delResult = await request('DELETE', `/api/conversations/${conversationId}`, null, userCookies);
    test('Delete conversation returns 200', delResult.status === 200);
  }

  // Test 12: Update profile
  console.log('\n--- Test 12: Update Profile ---');
  const profileResult = await request('PATCH', '/api/profile', {
    employeeId: 'EMP123',
    mobile: '+1234567890',
  }, userCookies);
  test('Update profile returns 200', profileResult.status === 200);
  test('Profile updated correctly', profileResult.data?.user?.employeeId === 'EMP123');

  // Test 13: Change password
  console.log('\n--- Test 13: Change Password ---');
  const changePwResult = await request('POST', '/api/profile/change-password', {
    currentPassword: 'password123',
    newPassword: 'newpassword123',
  }, userCookies);
  test('Change password returns 200', changePwResult.status === 200);

  // Test 14: Login with new password
  console.log('\n--- Test 14: Login with New Password ---');
  const newLoginResult = await request('POST', '/api/auth/login', {
    email: testEmail,
    password: 'newpassword123',
  });
  test('Login with new password works', newLoginResult.status === 200);
  userCookies = newLoginResult.cookies || '';

  // Test 15: Submit password reset request
  console.log('\n--- Test 15: Password Reset Request ---');
  const resetReqResult = await request('POST', '/api/password-reset/request', {
    newPassword: 'requestedpassword123',
    reason: 'Forgot my password',
  }, userCookies);
  test('Password reset request returns 200', resetReqResult.status === 200);
  test('Request ID returned', Boolean(resetReqResult.data?.requestId));

  // Test 16: Submit feedback
  console.log('\n--- Test 16: Submit Feedback ---');
  const feedbackResult = await request('POST', '/api/feedback', {
    feedbackType: 'positive',
    feedbackText: 'Great chatbot!',
    rating: 5,
  }, userCookies);
  test('Submit feedback returns 200', feedbackResult.status === 200);

  // Test 17: Non-admin cannot access admin routes
  console.log('\n--- Test 17: Admin Routes Require Admin Role ---');
  const adminAccessResult = await request('GET', '/api/admin/users', null, userCookies);
  test('Non-admin gets 403 on admin route', adminAccessResult.status === 403);

  // Test 18: Create admin user and test admin functions
  console.log('\n--- Test 18: Admin User Registration ---');
  // First, create admin via direct database update (simulating initial setup)
  const adminRegResult = await request('POST', '/api/auth/register', {
    email: adminEmail,
    password: 'adminpass123',
    firstName: 'Admin',
    lastName: 'User',
  });
  test('Admin registration returns 200', adminRegResult.status === 200);
  
  // Since we can't directly set isAdmin via API, we'll skip admin tests
  // In production, the first user or users created via database would be admins
  console.log('\n⚠️  Note: Admin-specific tests skipped (would require database update to set isAdmin=true)');

  // Summary
  console.log('\n\n=== Test Summary ===');
  console.log(`Total Tests: ${results.tests.length}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.tests.length) * 100).toFixed(1)}%`);

  if (results.failed > 0) {
    console.log('\nFailed Tests:');
    results.tests.filter(t => !t.passed).forEach(t => {
      console.log(`  - ${t.name}${t.message ? ': ' + t.message : ''}`);
    });
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
