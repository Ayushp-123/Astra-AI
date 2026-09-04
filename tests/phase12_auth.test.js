import test from 'node:test';
import assert from 'node:assert/strict';

import { isSupabaseConfigured } from '../src/services/supabaseClient.js';
import { 
  authService, 
  formatAuthError, 
  getUserDisplayName, 
  getUserInitials 
} from '../src/services/authService.js';
import { useStore } from '../src/store/useStore.js';
import { searchStudyMaterial } from '../src/services/searchService.js';
import { parseSummaryResponse, parseFlashcardsResponse, parseQuizResponse } from '../src/services/aiService.js';

test('ASTRA AI Phase 12 — Authentication + Light UI Personalization Test Suite', async (t) => {

  // =========================================================================
  // TEST 1: Missing Supabase configuration is handled safely
  // =========================================================================
  await t.test('TEST 1: Missing or placeholder Supabase configuration does not crash the application', () => {
    const configured = isSupabaseConfigured();
    assert.equal(typeof configured, 'boolean');
  });

  // =========================================================================
  // TEST 2: Auth service exposes essential authentication methods
  // =========================================================================
  await t.test('TEST 2: Auth service exposes signUp, signIn, signOut, getSession, getUser, and onAuthStateChange', () => {
    assert.equal(typeof authService.signUp, 'function');
    assert.equal(typeof authService.signIn, 'function');
    assert.equal(typeof authService.signOut, 'function');
    assert.equal(typeof authService.getCurrentSession, 'function');
    assert.equal(typeof authService.getCurrentUser, 'function');
    assert.equal(typeof authService.updateProfile, 'function');
    assert.equal(typeof authService.onAuthStateChange, 'function');
  });

  // =========================================================================
  // TEST 3: Invalid login produces safe user-facing error handling
  // =========================================================================
  await t.test('TEST 3: formatAuthError sanitizes and translates error messages cleanly', () => {
    const err1 = formatAuthError({ message: 'Invalid login credentials' });
    assert.ok(err1.includes('Invalid email or password'));

    const err2 = formatAuthError({ message: 'User already registered' });
    assert.ok(err2.includes('already exists'));

    const err3 = formatAuthError({ message: 'Password should be at least 6 characters' });
    assert.ok(err3.includes('at least 6 characters'));

    const err4 = formatAuthError({ message: 'Failed to fetch' });
    assert.ok(err4.includes('Network error'));
  });

  // =========================================================================
  // TEST 4: Authenticated session updates Zustand auth state
  // =========================================================================
  await t.test('TEST 4: Setting session updates session and user in Zustand store', () => {
    const mockUser = {
      id: 'usr-12345',
      email: 'alex.rivera@mit.edu',
      user_metadata: { display_name: 'Alex Rivera' }
    };
    const mockSession = {
      access_token: 'mock-jwt-token',
      user: mockUser
    };

    useStore.getState().setSession(mockSession);

    const state = useStore.getState();
    assert.deepEqual(state.session, mockSession);
    assert.deepEqual(state.user, mockUser);
  });

  // =========================================================================
  // TEST 5: Sign out clears auth state
  // =========================================================================
  await t.test('TEST 5: signOutUser clears user and session in Zustand store', async () => {
    useStore.setState({
      user: { id: 'usr-1', email: 'test@example.com' },
      session: { access_token: 'tok' }
    });

    await useStore.getState().signOutUser();

    const state = useStore.getState();
    assert.equal(state.user, null);
    assert.equal(state.session, null);
  });

  // =========================================================================
  // TEST 6: Local IndexedDB study data is NOT deleted on logout
  // =========================================================================
  await t.test('TEST 6: Signing out preserves all local study data (documents, subjects, chats, quizzes)', async () => {
    const mockDocs = [{ id: 'doc-1', name: 'Operating Systems Ch1.pdf', subjectId: 'subj-os', chunks: [] }];
    const mockSubjects = [{ id: 'subj-os', name: 'Operating Systems', documentIds: ['doc-1'] }];
    const mockChats = { 'doc_doc-1': [{ sender: 'user', text: 'Explain virtual memory' }] };

    useStore.setState({
      user: { id: 'usr-123', email: 'student@mit.edu' },
      session: { access_token: 'valid' },
      documents: mockDocs,
      subjects: mockSubjects,
      scopedChats: mockChats
    });

    // Execute sign out
    await useStore.getState().signOutUser();

    const state = useStore.getState();
    // Auth must be cleared
    assert.equal(state.user, null);
    assert.equal(state.session, null);

    // Study data MUST remain intact!
    assert.equal(state.documents.length, 1);
    assert.equal(state.documents[0].id, 'doc-1');
    assert.equal(state.subjects.length, 1);
    assert.equal(state.scopedChats['doc_doc-1'].length, 1);
  });

  // =========================================================================
  // TEST 7: Display name is loaded from authenticated user metadata
  // =========================================================================
  await t.test('TEST 7: getUserDisplayName extracts name from display_name, full_name, or email prefix', () => {
    const userWithDisplay = { user_metadata: { display_name: 'Ayush Patnayak' } };
    assert.equal(getUserDisplayName(userWithDisplay), 'Ayush Patnayak');

    const userWithFull = { user_metadata: { full_name: 'Ada Lovelace' } };
    assert.equal(getUserDisplayName(userWithFull), 'Ada Lovelace');

    const userWithEmail = { email: 'turing@cambridge.ac.uk', user_metadata: {} };
    assert.equal(getUserDisplayName(userWithEmail), 'Turing');

    const emptyUser = null;
    assert.equal(getUserDisplayName(emptyUser), '');
  });

  // =========================================================================
  // TEST 8: Avatar initials formatting
  // =========================================================================
  await t.test('TEST 8: getUserInitials formats 1-2 letter uppercase initials correctly', () => {
    const user1 = { user_metadata: { display_name: 'Ayush Patnayak' } };
    assert.equal(getUserInitials(user1), 'AP');

    const user2 = { user_metadata: { display_name: 'Euler' } };
    assert.equal(getUserInitials(user2), 'EU');

    const user3 = null;
    assert.equal(getUserInitials(user3), 'A');
  });

  // =========================================================================
  // TEST 9: View routing support in store
  // =========================================================================
  await t.test('TEST 9: useStore supports view navigation between home, login, signup, profile, dashboard', () => {
    useStore.getState().setActiveView('login');
    assert.equal(useStore.getState().activeView, 'login');

    useStore.getState().setActiveView('signup');
    assert.equal(useStore.getState().activeView, 'signup');

    useStore.getState().setActiveView('profile');
    assert.equal(useStore.getState().activeView, 'profile');

    useStore.getState().setActiveView('dashboard');
    assert.equal(useStore.getState().activeView, 'dashboard');

    useStore.getState().setActiveView('home');
    assert.equal(useStore.getState().activeView, 'home');
  });

  // =========================================================================
  // TEST 10: Auth initialization prevents login screen flashing
  // =========================================================================
  await t.test('TEST 10: initializeAuth sets authInitialized to true', async () => {
    useStore.setState({ authInitialized: false });
    await useStore.getState().initializeAuth();
    assert.equal(useStore.getState().authInitialized, true);
  });

  // =========================================================================
  // TEST 11: Existing documents and subjects remain available
  // =========================================================================
  await t.test('TEST 11: Document addition and subject management work with auth state present', () => {
    const newDoc = {
      id: 'doc-test-101',
      name: 'Computer Networks.pdf',
      subjectId: 'subj_networks',
      subjectName: 'Computer Networks',
      fullText: 'The OSI model has 7 layers: Physical, Data Link, Network, Transport, Session, Presentation, Application.',
      chunks: [
        { page: 1, text: 'The OSI model has 7 layers.' }
      ]
    };

    useStore.getState().addDocument(newDoc);
    useStore.getState().addOrUpdateSubject('Computer Networks', 'doc-test-101');

    const state = useStore.getState();
    const doc = state.documents.find(d => d.id === 'doc-test-101');
    assert.ok(doc);
    assert.equal(doc.name, 'Computer Networks.pdf');
  });

  // =========================================================================
  // TEST 12: Existing search functionality works seamlessly
  // =========================================================================
  await t.test('TEST 12: Study search indexes and retrieves document chunks correctly', () => {
    const docs = useStore.getState().documents;
    const results = searchStudyMaterial('OSI model', docs);
    assert.ok(results.length > 0);
    assert.ok(results[0].snippet.includes('OSI model') || results[0].documentName.includes('Networks'));
  });

  // =========================================================================
  // TEST 13: Summary parser and schema validator remain robust
  // =========================================================================
  await t.test('TEST 13: Summary parsing works as expected', () => {
    const rawJson = JSON.stringify({
      shortSummary: "Network protocols enable reliable communication across the internet.",
      keyConcepts: ["TCP/IP Stack", "Routing", "DNS Resolution"],
      importantDefinitions: [{ term: "IP Address", definition: "A unique address identifying a device on the internet or local network." }],
      importantPoints: ["TCP provides guaranteed delivery.", "UDP is connectionless and low-latency."],
      examPoints: ["Memorize the 7 layers of OSI model.", "Differentiate TCP vs UDP header structure."]
    });

    const parsed = parseSummaryResponse(rawJson);
    assert.ok(parsed.shortSummary);
    assert.equal(parsed.keyConcepts.length, 3);
  });

  // =========================================================================
  // TEST 14: Flashcards parser remains robust
  // =========================================================================
  await t.test('TEST 14: Flashcards parsing creates valid question and answer cards', () => {
    const rawJson = JSON.stringify({
      cards: [
        { front: "What layer is responsible for routing packets?", back: "Network Layer (Layer 3)" },
        { front: "What protocol operates at the Transport layer for reliable delivery?", back: "TCP (Transmission Control Protocol)" }
      ]
    });

    const parsed = parseFlashcardsResponse(rawJson);
    assert.ok(parsed.cards);
    assert.equal(parsed.cards.length, 2);
  });

  // =========================================================================
  // TEST 15: Quiz parser remains robust
  // =========================================================================
  await t.test('TEST 15: Quiz parser generates structured questions with explanations', () => {
    const rawJson = JSON.stringify({
      title: "Computer Networks Diagnostic",
      questions: [
        {
          id: "q1",
          type: "mcq",
          question: "Which protocol is connectionless?",
          options: ["TCP", "UDP", "HTTP", "FTP"],
          correctAnswer: 1,
          explanation: "UDP does not establish a connection before transmitting."
        }
      ]
    });

    const parsed = parseQuizResponse(rawJson);
    assert.ok(parsed.title);
    assert.equal(parsed.questions.length, 1);
  });

});
