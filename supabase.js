import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://elshnwqzqvfdzgfmhhmp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsc2hud3F6cXZmZHpnZm1oaG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0ODAwMTQsImV4cCI6MjEwODA1NjAxNH0.rbCqvx-8OU2HFcXidDhoIiFPE0GfDkFu737AlGWUVGk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
