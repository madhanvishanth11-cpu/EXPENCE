import { supabase, isSupabaseConfigured } from './supabase';

/**
 * SpendWise Hybrid Database & Local Storage Layer
 * - Works 100% offline and standalone without requiring login or database setup.
 * - If an authenticated Supabase session is present, securely synchronizes with Supabase cloud.
 * - Never blocks the user with login screens or "Not authenticated" exceptions.
 */

// Local Storage Keys
const STORAGE_KEYS = {
  PROFILE: 'spendwise_profile',
  ACCOUNTS: 'spendwise_accounts',
  CATEGORIES: 'spendwise_categories',
  TRANSACTIONS: 'spendwise_transactions',
  BUDGETS: 'spendwise_budgets',
};

// Default seed data for immediate out-of-the-box experience
export const DEFAULT_ACCOUNTS = [
  {
    id: 'acc_bank_default',
    name: 'Primary Bank Account',
    account_type: 'bank',
    opening_balance: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'acc_cash_default',
    name: 'Cash in Hand',
    account_type: 'cash',
    opening_balance: 0,
    created_at: new Date().toISOString(),
  },
];

export const DEFAULT_CATEGORIES = [
  { id: 'cat_groceries', name: 'Groceries & Food', transaction_type: 'expense', icon: 'shopping-cart' },
  { id: 'cat_dining', name: 'Dining Out', transaction_type: 'expense', icon: 'utensils' },
  { id: 'cat_rent', name: 'Rent & Housing', transaction_type: 'expense', icon: 'home' },
  { id: 'cat_bills', name: 'Utilities & Bills', transaction_type: 'expense', icon: 'zap' },
  { id: 'cat_transport', name: 'Transportation & Fuel', transaction_type: 'expense', icon: 'car' },
  { id: 'cat_shopping', name: 'Shopping & Retail', transaction_type: 'expense', icon: 'bag' },
  { id: 'cat_healthcare', name: 'Healthcare & Medical', transaction_type: 'expense', icon: 'activity' },
  { id: 'cat_entertainment', name: 'Entertainment & OTT', transaction_type: 'expense', icon: 'tv' },
  { id: 'cat_education', name: 'Education & Courses', transaction_type: 'expense', icon: 'book' },
  { id: 'cat_misc', name: 'Miscellaneous', transaction_type: 'expense', icon: 'tag' },
  { id: 'cat_salary', name: 'Salary', transaction_type: 'income', icon: 'briefcase' },
  { id: 'cat_freelance', name: 'Freelance / Consulting', transaction_type: 'income', icon: 'laptop' },
  { id: 'cat_investments', name: 'Investments & Dividends', transaction_type: 'income', icon: 'trending-up' },
  { id: 'cat_other_income', name: 'Other Income', transaction_type: 'income', icon: 'gift' },
];

const getLocal = (key, defaultVal) => {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
};

const setLocal = (key, val) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.warn('localStorage write failed:', err);
  }
};

/**
 * Checks if Supabase has an active, authenticated user session.
 */
export const hasSupabaseAuth = async () => {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) return false;
    return true;
  } catch {
    return false;
  }
};

// --- Profiles ---
export const getProfile = async (userId) => {
  if (await hasSupabaseAuth()) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) return data;
    } catch {
      // Fall through to local
    }
  }

  const localProfile = getLocal(STORAGE_KEYS.PROFILE, {
    id: userId || 'local-user',
    display_name: 'SpendWise User',
    currency: 'INR',
    theme: 'light',
  });
  return localProfile;
};

export const updateProfile = async (userId, updates) => {
  if (await hasSupabaseAuth()) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      if (!error && data) return data;
    } catch {
      // Fall through to local
    }
  }

  const current = await getProfile(userId);
  const updated = { ...current, ...updates, updated_at: new Date().toISOString() };
  setLocal(STORAGE_KEYS.PROFILE, updated);
  return updated;
};

// --- Accounts ---
export const getAccounts = async () => {
  if (await hasSupabaseAuth()) {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: true });
      if (!error && data && data.length > 0) return data;
    } catch {
      // Fall through to local
    }
  }

  let accounts = getLocal(STORAGE_KEYS.ACCOUNTS, null);
  if (!accounts || accounts.length === 0) {
    accounts = [...DEFAULT_ACCOUNTS];
    setLocal(STORAGE_KEYS.ACCOUNTS, accounts);
  }
  return accounts;
};

export const createAccount = async (account) => {
  if (await hasSupabaseAuth()) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('accounts')
          .insert({
            user_id: user.id,
            name: account.name,
            account_type: account.account_type || account.type || 'bank',
            opening_balance: Number(account.opening_balance || account.balance || 0),
          })
          .select()
          .single();
        if (!error && data) return data;
      }
    } catch {
      // Fall through to local
    }
  }

  const accounts = await getAccounts();
  const newAccount = {
    id: `acc_${Date.now()}`,
    name: account.name,
    account_type: account.account_type || account.type || 'bank',
    opening_balance: Number(account.opening_balance || account.balance || 0),
    created_at: new Date().toISOString(),
  };
  const updated = [...accounts, newAccount];
  setLocal(STORAGE_KEYS.ACCOUNTS, updated);
  return newAccount;
};

export const updateAccount = async (id, account) => {
  if (await hasSupabaseAuth()) {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .update({
          name: account.name,
          account_type: account.account_type || account.type,
          opening_balance: Number(account.opening_balance ?? account.balance ?? 0),
        })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data;
    } catch {
      // Fall through to local
    }
  }

  const accounts = await getAccounts();
  let updatedItem = null;
  const updated = accounts.map((acc) => {
    if (acc.id === id) {
      updatedItem = {
        ...acc,
        name: account.name ?? acc.name,
        account_type: (account.account_type || account.type) ?? acc.account_type,
        opening_balance: Number(account.opening_balance ?? account.balance ?? acc.opening_balance),
      };
      return updatedItem;
    }
    return acc;
  });
  setLocal(STORAGE_KEYS.ACCOUNTS, updated);
  return updatedItem || account;
};

export const deleteAccount = async (id) => {
  if (await hasSupabaseAuth()) {
    try {
      await supabase.from('accounts').delete().eq('id', id);
    } catch {
      // Fall through to local
    }
  }

  const accounts = await getAccounts();
  const filtered = accounts.filter((acc) => acc.id !== id);
  setLocal(STORAGE_KEYS.ACCOUNTS, filtered);
};

// --- Categories ---
export const getCategories = async () => {
  if (await hasSupabaseAuth()) {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
      if (!error && data && data.length > 0) return data;
    } catch {
      // Fall through to local
    }
  }

  let categories = getLocal(STORAGE_KEYS.CATEGORIES, null);
  if (!categories || categories.length === 0) {
    categories = [...DEFAULT_CATEGORIES];
    setLocal(STORAGE_KEYS.CATEGORIES, categories);
  }
  return categories;
};

export const createCategory = async (category) => {
  if (await hasSupabaseAuth()) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('categories')
          .insert({
            user_id: user.id,
            name: category.name,
            transaction_type: category.transaction_type,
            icon: category.icon || 'tag',
          })
          .select()
          .single();
        if (!error && data) return data;
      }
    } catch {
      // Fall through to local
    }
  }

  const categories = await getCategories();
  const newCat = {
    id: `cat_${Date.now()}`,
    name: category.name,
    transaction_type: category.transaction_type,
    icon: category.icon || 'tag',
  };
  const updated = [...categories, newCat];
  setLocal(STORAGE_KEYS.CATEGORIES, updated);
  return newCat;
};

// --- Transactions ---
export const getTransactions = async () => {
  if (await hasSupabaseAuth()) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          account:accounts (id, name, account_type),
          category:categories (id, name, icon)
        `)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    } catch {
      // Fall through to local
    }
  }

  const transactions = getLocal(STORAGE_KEYS.TRANSACTIONS, []);
  const accounts = await getAccounts();
  const categories = await getCategories();

  const accMap = new Map(accounts.map((a) => [a.id, a]));
  const catMap = new Map(categories.map((c) => [c.id, c]));

  // Populate joined relations
  const enriched = transactions.map((tx) => ({
    ...tx,
    account: accMap.get(tx.account_id) || { id: tx.account_id, name: 'Account', account_type: 'bank' },
    category: tx.category_id ? catMap.get(tx.category_id) || { id: tx.category_id, name: 'Category', icon: 'tag' } : null,
  }));

  // Sort descending
  enriched.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
  return enriched;
};

export const createTransaction = async (tx) => {
  if (await hasSupabaseAuth()) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (tx.type === 'transfer' && tx.destination_account_id) {
          const { data: groupId, error: rpcError } = await supabase.rpc('create_transfer', {
            p_source_account_id: tx.account_id,
            p_destination_account_id: tx.destination_account_id,
            p_amount: Number(tx.amount),
            p_payment_method: tx.payment_method,
            p_description: tx.description,
            p_transaction_date: tx.transaction_date,
          });
          if (!rpcError && groupId) {
            return { id: groupId, transfer_group_id: groupId, type: 'transfer' };
          }
        }

        const { data, error } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            account_id: tx.account_id,
            category_id: tx.category_id || null,
            type: tx.type,
            amount: Number(tx.amount),
            payment_method: tx.payment_method,
            description: tx.description,
            transaction_date: tx.transaction_date || new Date().toISOString().split('T')[0],
            transfer_group_id: tx.transfer_group_id || null,
          })
          .select(`
            *,
            account:accounts (id, name, account_type),
            category:categories (id, name, icon)
          `)
          .single();
        if (!error && data) return data;
      }
    } catch {
      // Fall through to local
    }
  }

  const transactions = getLocal(STORAGE_KEYS.TRANSACTIONS, []);
  const accounts = await getAccounts();
  const categories = await getCategories();

  const acc = accounts.find((a) => a.id === tx.account_id) || { id: tx.account_id, name: 'Account', account_type: 'bank' };
  const cat = tx.category_id ? categories.find((c) => c.id === tx.category_id) || null : null;

  if (tx.type === 'transfer' && tx.destination_account_id) {
    const transferGroupId = `tr_${Date.now()}`;
    const destAcc = accounts.find((a) => a.id === tx.destination_account_id) || { id: tx.destination_account_id, name: 'Account', account_type: 'bank' };

    const debitTx = {
      id: `tx_${Date.now()}_out`,
      account_id: tx.account_id,
      category_id: null,
      type: 'transfer',
      amount: Number(tx.amount),
      payment_method: tx.payment_method,
      description: tx.description ? `Transfer to ${destAcc.name}: ${tx.description}` : `Transfer to ${destAcc.name}`,
      transaction_date: tx.transaction_date || new Date().toISOString().split('T')[0],
      transfer_group_id: transferGroupId,
      created_at: new Date().toISOString(),
      account: acc,
      category: null,
    };

    const creditTx = {
      id: `tx_${Date.now()}_in`,
      account_id: tx.destination_account_id,
      category_id: null,
      type: 'transfer',
      amount: Number(tx.amount),
      payment_method: tx.payment_method,
      description: tx.description ? `Transfer from ${acc.name}: ${tx.description}` : `Transfer from ${acc.name}`,
      transaction_date: tx.transaction_date || new Date().toISOString().split('T')[0],
      transfer_group_id: transferGroupId,
      created_at: new Date().toISOString(),
      account: destAcc,
      category: null,
    };

    setLocal(STORAGE_KEYS.TRANSACTIONS, [debitTx, creditTx, ...transactions]);
    return debitTx;
  }

  const newTx = {
    id: `tx_${Date.now()}`,
    account_id: tx.account_id,
    category_id: tx.category_id || null,
    type: tx.type,
    amount: Number(tx.amount),
    payment_method: tx.payment_method,
    description: tx.description,
    transaction_date: tx.transaction_date || new Date().toISOString().split('T')[0],
    transfer_group_id: tx.transfer_group_id || null,
    created_at: new Date().toISOString(),
    account: acc,
    category: cat,
  };

  setLocal(STORAGE_KEYS.TRANSACTIONS, [newTx, ...transactions]);
  return newTx;
};

export const updateTransaction = async (id, tx) => {
  if (await hasSupabaseAuth()) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update({
          account_id: tx.account_id,
          category_id: tx.category_id || null,
          type: tx.type,
          amount: Number(tx.amount),
          payment_method: tx.payment_method,
          description: tx.description,
          transaction_date: tx.transaction_date,
        })
        .eq('id', id)
        .select(`
          *,
          account:accounts (id, name, account_type),
          category:categories (id, name, icon)
        `)
        .single();
      if (!error && data) return data;
    } catch {
      // Fall through to local
    }
  }

  const transactions = getLocal(STORAGE_KEYS.TRANSACTIONS, []);
  const accounts = await getAccounts();
  const categories = await getCategories();

  let updatedTx = null;
  const updated = transactions.map((item) => {
    if (item.id === id) {
      const acc = accounts.find((a) => a.id === (tx.account_id ?? item.account_id)) || item.account;
      const cat = (tx.category_id ?? item.category_id)
        ? categories.find((c) => c.id === (tx.category_id ?? item.category_id)) || item.category
        : null;

      updatedTx = {
        ...item,
        account_id: tx.account_id ?? item.account_id,
        category_id: tx.category_id ?? item.category_id,
        type: tx.type ?? item.type,
        amount: Number(tx.amount ?? item.amount),
        payment_method: tx.payment_method ?? item.payment_method,
        description: tx.description ?? item.description,
        transaction_date: tx.transaction_date ?? item.transaction_date,
        account: acc,
        category: cat,
      };
      return updatedTx;
    }
    return item;
  });

  setLocal(STORAGE_KEYS.TRANSACTIONS, updated);
  return updatedTx || tx;
};

export const deleteTransaction = async (id, transferGroupId = null) => {
  if (await hasSupabaseAuth()) {
    try {
      if (transferGroupId) {
        await supabase.from('transactions').delete().eq('transfer_group_id', transferGroupId);
      } else {
        await supabase.from('transactions').delete().eq('id', id);
      }
      return;
    } catch {
      // Fall through to local
    }
  }

  const transactions = getLocal(STORAGE_KEYS.TRANSACTIONS, []);
  let filtered;
  if (transferGroupId) {
    filtered = transactions.filter((tx) => tx.transfer_group_id !== transferGroupId);
  } else {
    filtered = transactions.filter((tx) => tx.id !== id);
  }
  setLocal(STORAGE_KEYS.TRANSACTIONS, filtered);
};

// --- Budgets ---
export const getBudgets = async (monthStart) => {
  if (await hasSupabaseAuth()) {
    try {
      let query = supabase.from('budgets').select(`
        *,
        category:categories (id, name, icon)
      `);
      if (monthStart) query = query.eq('month_start', monthStart);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && data) return data;
    } catch {
      // Fall through to local
    }
  }

  const budgets = getLocal(STORAGE_KEYS.BUDGETS, []);
  const categories = await getCategories();
  const catMap = new Map(categories.map((c) => [c.id, c]));

  let enriched = budgets.map((b) => ({
    ...b,
    category: b.category_id ? catMap.get(b.category_id) || null : null,
  }));

  if (monthStart) {
    enriched = enriched.filter((b) => b.month_start === monthStart);
  }
  return enriched;
};

export const saveBudget = async (budget) => {
  if (await hasSupabaseAuth()) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (budget.id) {
          const { data, error } = await supabase
            .from('budgets')
            .update({ amount_limit: Number(budget.amount_limit) })
            .eq('id', budget.id)
            .select(`*, category:categories (id, name, icon)`)
            .single();
          if (!error && data) return data;
        } else {
          const { data, error } = await supabase
            .from('budgets')
            .insert({
              user_id: user.id,
              category_id: budget.category_id || null,
              amount_limit: Number(budget.amount_limit),
              month_start: budget.month_start || new Date().toISOString().slice(0, 7) + '-01',
            })
            .select(`*, category:categories (id, name, icon)`)
            .single();
          if (!error && data) return data;
        }
      }
    } catch {
      // Fall through to local
    }
  }

  const budgets = getLocal(STORAGE_KEYS.BUDGETS, []);
  const categories = await getCategories();
  const cat = budget.category_id ? categories.find((c) => c.id === budget.category_id) || null : null;

  if (budget.id) {
    let updatedBudget = null;
    const updated = budgets.map((b) => {
      if (b.id === budget.id) {
        updatedBudget = {
          ...b,
          amount_limit: Number(budget.amount_limit),
          category: cat,
        };
        return updatedBudget;
      }
      return b;
    });
    setLocal(STORAGE_KEYS.BUDGETS, updated);
    return updatedBudget || budget;
  }

  const newBudget = {
    id: `bgt_${Date.now()}`,
    category_id: budget.category_id || null,
    amount_limit: Number(budget.amount_limit),
    month_start: budget.month_start || new Date().toISOString().slice(0, 7) + '-01',
    created_at: new Date().toISOString(),
    category: cat,
  };

  setLocal(STORAGE_KEYS.BUDGETS, [newBudget, ...budgets]);
  return newBudget;
};

export const deleteBudget = async (id) => {
  if (await hasSupabaseAuth()) {
    try {
      await supabase.from('budgets').delete().eq('id', id);
      return;
    } catch {
      // Fall through to local
    }
  }

  const budgets = getLocal(STORAGE_KEYS.BUDGETS, []);
  const filtered = budgets.filter((b) => b.id !== id);
  setLocal(STORAGE_KEYS.BUDGETS, filtered);
};

// --- Auto-Seed Defaults ---
export const seedDefaultsForUser = async (userId) => {
  // Always seed local storage so user has accounts & categories instantly
  let localAccs = getLocal(STORAGE_KEYS.ACCOUNTS, null);
  if (!localAccs || localAccs.length === 0) {
    setLocal(STORAGE_KEYS.ACCOUNTS, DEFAULT_ACCOUNTS);
  }

  let localCats = getLocal(STORAGE_KEYS.CATEGORIES, null);
  if (!localCats || localCats.length === 0) {
    setLocal(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
  }

  // If Supabase is connected with authenticated user, seed Supabase tables as well
  if (supabase && userId && userId !== 'local-user') {
    try {
      const { data: existingAccounts } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (!existingAccounts || existingAccounts.length === 0) {
        await supabase.from('accounts').insert([
          { user_id: userId, name: 'Primary Bank Account', account_type: 'bank', opening_balance: 0 },
          { user_id: userId, name: 'Cash in Hand', account_type: 'cash', opening_balance: 0 },
        ]);
      }

      const { data: existingCategories } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (!existingCategories || existingCategories.length === 0) {
        await supabase.from('categories').insert(
          DEFAULT_CATEGORIES.map((c) => ({
            user_id: userId,
            name: c.name,
            transaction_type: c.transaction_type,
            icon: c.icon,
          }))
        );
      }
    } catch (err) {
      console.warn('Supabase auto-seed notice:', err.message);
    }
  }
};
