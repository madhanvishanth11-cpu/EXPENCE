import { supabase } from './supabase';

/**
 * SpendWise Database Access Layer
 * All operations run through authenticated Supabase client with RLS active.
 * Strict Error Handling: Never silently fail or pretend success when database is disconnected.
 */

const assertClient = () => {
  if (!supabase) {
    throw new Error('Supabase client is not initialized. Please verify your database connection in Settings.');
  }
};

// --- Profiles ---
export const getProfile = async (userId) => {
  assertClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const updateProfile = async (userId, updates) => {
  assertClient();
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// --- Accounts ---
export const getAccounts = async () => {
  assertClient();
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const createAccount = async (account) => {
  assertClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated: please sign in to create accounts');

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
  if (error) throw error;
  if (!data) throw new Error('Database did not return created account confirmation');
  return data;
};

export const updateAccount = async (id, account) => {
  assertClient();
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
  if (error) throw error;
  if (!data) throw new Error('Database did not return updated account confirmation');
  return data;
};

export const deleteAccount = async (id) => {
  assertClient();
  const { error } = await supabase.from('accounts').delete().eq('id', id);
  if (error) throw error;
};

// --- Categories ---
export const getCategories = async () => {
  assertClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const createCategory = async (category) => {
  assertClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated: please sign in to create categories');

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
  if (error) throw error;
  if (!data) throw new Error('Database did not return created category confirmation');
  return data;
};

// --- Transactions ---
export const getTransactions = async () => {
  assertClient();
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      account:accounts (id, name, account_type),
      category:categories (id, name, icon)
    `)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const createTransaction = async (tx) => {
  assertClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated: please sign in to save transactions');

  // If this is a transfer, call the atomic RPC function
  if (tx.type === 'transfer' && tx.destination_account_id) {
    const { data: groupId, error: rpcError } = await supabase.rpc('create_transfer', {
      p_source_account_id: tx.account_id,
      p_destination_account_id: tx.destination_account_id,
      p_amount: Number(tx.amount),
      p_payment_method: tx.payment_method,
      p_description: tx.description,
      p_transaction_date: tx.transaction_date,
    });
    if (rpcError) throw rpcError;
    if (!groupId) throw new Error('Database transfer RPC failed: No transaction ID returned');
    return { id: groupId, transfer_group_id: groupId, type: 'transfer' };
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
  if (error) throw error;
  if (!data || !data.id) {
    throw new Error('Database did not confirm the transaction save. Please check your database connection.');
  }
  return data;
};

export const updateTransaction = async (id, tx) => {
  assertClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated: please sign in to update transactions');

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
  if (error) throw error;
  if (!data || !data.id) {
    throw new Error('Database did not confirm the transaction update.');
  }
  return data;
};

export const deleteTransaction = async (id, transferGroupId = null) => {
  assertClient();
  if (transferGroupId) {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('transfer_group_id', transferGroupId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
  }
};

// --- Budgets ---
export const getBudgets = async (monthStart) => {
  assertClient();
  let query = supabase.from('budgets').select(`
    *,
    category:categories (id, name, icon)
  `);

  if (monthStart) {
    query = query.eq('month_start', monthStart);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const saveBudget = async (budget) => {
  assertClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated: please sign in to save budgets');

  if (budget.id) {
    const { data, error } = await supabase
      .from('budgets')
      .update({
        amount_limit: Number(budget.amount_limit),
      })
      .eq('id', budget.id)
      .select(`*, category:categories (id, name, icon)`)
      .single();
    if (error) throw error;
    if (!data) throw new Error('Database did not confirm budget update');
    return data;
  }

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
  if (error) throw error;
  if (!data) throw new Error('Database did not confirm budget save');
  return data;
};

export const deleteBudget = async (id) => {
  assertClient();
  const { error } = await supabase.from('budgets').delete().eq('id', id);
  if (error) throw error;
};

// --- Auto-Seed Defaults for new/existing users without accounts/categories ---
export const seedDefaultsForUser = async (userId) => {
  if (!supabase || !userId) return;

  try {
    // 1. Seed accounts if user has none
    const { data: existingAccounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (!existingAccounts || existingAccounts.length === 0) {
      await supabase.from('accounts').insert([
        { user_id: userId, name: 'Primary Bank Account', account_type: 'bank', opening_balance: 0 },
        { user_id: userId, name: 'Cash in Hand', account_type: 'cash', opening_balance: 0 }
      ]);
    }

    // 2. Seed categories if user has none
    const { data: existingCategories } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (!existingCategories || existingCategories.length === 0) {
      await supabase.from('categories').insert([
        { user_id: userId, name: 'Groceries & Food', transaction_type: 'expense', icon: 'shopping-cart' },
        { user_id: userId, name: 'Dining Out', transaction_type: 'expense', icon: 'utensils' },
        { user_id: userId, name: 'Rent & Housing', transaction_type: 'expense', icon: 'home' },
        { user_id: userId, name: 'Utilities & Bills', transaction_type: 'expense', icon: 'zap' },
        { user_id: userId, name: 'Transportation & Fuel', transaction_type: 'expense', icon: 'car' },
        { user_id: userId, name: 'Shopping & Retail', transaction_type: 'expense', icon: 'bag' },
        { user_id: userId, name: 'Healthcare & Medical', transaction_type: 'expense', icon: 'activity' },
        { user_id: userId, name: 'Entertainment & OTT', transaction_type: 'expense', icon: 'tv' },
        { user_id: userId, name: 'Education & Courses', transaction_type: 'expense', icon: 'book' },
        { user_id: userId, name: 'Miscellaneous', transaction_type: 'expense', icon: 'tag' },
        { user_id: userId, name: 'Salary', transaction_type: 'income', icon: 'briefcase' },
        { user_id: userId, name: 'Freelance / Consulting', transaction_type: 'income', icon: 'laptop' },
        { user_id: userId, name: 'Investments & Dividends', transaction_type: 'income', icon: 'trending-up' },
        { user_id: userId, name: 'Other Income', transaction_type: 'income', icon: 'gift' }
      ]);
    }
  } catch (err) {
    console.warn('Auto-seed defaults encountered notice:', err.message);
  }
};
