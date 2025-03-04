// Game configuration
let config = {
  // Default configuration (will be overridden by server config)
  supabase: {
    url: null,
    key: null
  },
  
  // Leaderboard configuration
  leaderboard: {
    maxEntries: 10, // Maximum number of entries to display
    refreshInterval: 60000 // Refresh leaderboard every minute (in milliseconds)
  }
};

// Function to load configuration from server
async function loadConfig() {
  try {
    const response = await fetch('/api/config');
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status} ${response.statusText}`);
    }
    
    const serverConfig = await response.json();
    
    // Update config with server values
    config = {
      ...config,
      ...serverConfig
    };
    
    console.log('Configuration loaded from server');
    
    // Initialize Supabase after config is loaded
    initializeSupabase();
    
    // Dispatch event to notify that config is loaded
    window.dispatchEvent(new CustomEvent('configLoaded'));
  } catch (error) {
    console.error('Error loading configuration:', error);
  }
}

// Function to initialize Supabase with loaded config
function initializeSupabase() {
  if (!config.supabase.url || !config.supabase.key) {
    console.error('Supabase configuration is missing');
    return;
  }
  
  try {
    // Initialize Supabase client
    window.supabaseClient = supabase.createClient(
      config.supabase.url,
      config.supabase.key
    );
    
    console.log('Supabase client initialized');
    
    // Check if the leaderboard table exists and create it if needed
    checkLeaderboardTable();
    
    // Initialize leaderboard functions
    initializeLeaderboard();
  } catch (error) {
    console.error('Error initializing Supabase:', error);
  }
}

// Function to check if the leaderboard table exists and create it if needed
async function checkLeaderboardTable() {
  try {
    console.log('Checking if leaderboard table exists...');
    
    // Try to query the leaderboard table
    const { data, error } = await window.supabaseClient
      .from('leaderboard')
      .select('count', { count: 'exact', head: true });
    
    // If there's an error, it might be because the table doesn't exist
    if (error) {
      console.error('Error checking leaderboard table:', error);
      console.error('Error details:', error.message, error.details, error.hint);
      
      if (error.code === '42P01') { // PostgreSQL error code for undefined_table
        console.log('Leaderboard table does not exist, creating it...');
        
        // We can't create tables from the client side directly with Supabase
        // Instead, we'll log a message to help the user
        console.error('Please create the leaderboard table in your Supabase dashboard:');
        console.error('1. Go to your Supabase project');
        console.error('2. Go to the SQL Editor');
        console.error('3. Run the following SQL:');
        console.error(`
          CREATE TABLE public.leaderboard (
            id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            player_name text NOT NULL,
            email text NOT NULL,
            score integer NOT NULL,
            created_at timestamptz DEFAULT now()
          );
          
          -- Enable Row Level Security
          ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
          
          -- Create policy to allow anonymous inserts
          CREATE POLICY "Allow anonymous inserts" ON public.leaderboard
            FOR INSERT WITH CHECK (true);
          
          -- Create policy to allow anyone to read all scores
          CREATE POLICY "Allow anyone to read all scores" ON public.leaderboard
            FOR SELECT USING (true);
        `);
      } else if (error.code === '42501') { // PostgreSQL error code for permission denied
        console.error('Permission denied when accessing leaderboard table.');
        console.error('Make sure you have enabled Row Level Security (RLS) and created the necessary policies:');
        console.error(`
          -- Enable Row Level Security
          ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
          
          -- Create policy to allow anonymous inserts
          CREATE POLICY "Allow anonymous inserts" ON public.leaderboard
            FOR INSERT WITH CHECK (true);
          
          -- Create policy to allow anyone to read all scores
          CREATE POLICY "Allow anyone to read all scores" ON public.leaderboard
            FOR SELECT USING (true);
        `);
      }
    } else {
      console.log('Leaderboard table exists');
      
      // Test insert permission
      console.log('Testing insert permission...');
      try {
        const testData = {
          player_name: 'Test User',
          email: 'test@example.com',
          score: 0,
          created_at: new Date()
        };
        
        const { error: insertError } = await window.supabaseClient
          .from('leaderboard')
          .insert([testData])
          .select();
        
        if (insertError) {
          console.error('Error testing insert permission:', insertError);
          console.error('Error details:', insertError.message, insertError.details, insertError.hint);
          console.error('Make sure you have created the necessary RLS policy for inserts:');
          console.error(`
            CREATE POLICY "Allow anonymous inserts" ON public.leaderboard
              FOR INSERT WITH CHECK (true);
          `);
        } else {
          console.log('Insert permission test successful');
        }
      } catch (testErr) {
        console.error('Exception when testing insert permission:', testErr);
      }
    }
  } catch (err) {
    console.error('Exception when checking leaderboard table:', err);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
  }
}

// Function to initialize leaderboard functions
function initializeLeaderboard() {
  // Make leaderboard functions available globally
  window.gameLeaderboard = {
    submitScore: async (playerName, email, score) => {
      try {
        console.log('Attempting to submit score with:', { playerName, email, score });
        
        // Check if Supabase client exists
        if (!window.supabaseClient) {
          console.error('Supabase client is not initialized');
          return false;
        }
        
        const scoreData = { 
          player_name: playerName, 
          email: email, 
          score: score,
          created_at: new Date()
        };
        
        console.log('Submitting score data:', scoreData);
        
        const { data, error } = await window.supabaseClient
          .from('leaderboard')
          .insert([scoreData]);
          
        if (error) {
          console.error('Error submitting score:', error);
          console.error('Error details:', error.message, error.details, error.hint);
          return false;
        }
        
        console.log('Score submitted successfully:', data);
        return true;
      } catch (err) {
        console.error('Exception when submitting score:', err);
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
        return false;
      }
    },
    
    getTopScores: async (limit = config.leaderboard.maxEntries) => {
      try {
        const { data, error } = await window.supabaseClient
          .from('leaderboard')
          .select('*')
          .order('score', { ascending: false })
          .limit(limit);
          
        if (error) {
          console.error('Error fetching leaderboard:', error);
          return [];
        }
        
        return data || [];
      } catch (err) {
        console.error('Exception when fetching leaderboard:', err);
        return [];
      }
    },
    
    checkLeaderboardQualification: async (score, limit = config.leaderboard.maxEntries) => {
      try {
        const topScores = await window.gameLeaderboard.getTopScores(limit);
        
        // If we have fewer than 'limit' scores, any score qualifies
        if (topScores.length < limit) {
          return true;
        }
        
        // Check if the new score is higher than the lowest score on the leaderboard
        const lowestScore = topScores[topScores.length - 1].score;
        return score > lowestScore;
      } catch (err) {
        console.error('Error checking leaderboard qualification:', err);
        return false;
      }
    }
  };
}

// Make config available globally
window.gameConfig = config;

// Load configuration when the page loads
document.addEventListener('DOMContentLoaded', loadConfig); 