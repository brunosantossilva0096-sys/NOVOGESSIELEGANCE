import { supabase } from './supabase';
import type { User } from '../types';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  cpf?: string;
  phone?: string;
  birthDate?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

class AuthService {
  private currentUser: User | null = null;
  private session: any = null;

  async init(): Promise<void> {
    const { data: { session }, error } = await supabase.auth.getSession();
    this.session = session;

    if (session?.user) {
      await this.fetchProfile(session.user.id);
    }

    // Subscribe to auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      this.session = session;
      if (session?.user) {
        await this.fetchProfile(session.user.id);
      } else {
        this.currentUser = null;
      }
    });
  }

  private async fetchProfile(userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      this.currentUser = {
        id: data.id,
        name: data.name,
        email: data.email,
        cpf: data.cpf,
        phone: data.phone,
        addresses: data.addresses || [],
        role: data.role,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return !!this.currentUser && !!this.session;
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  isEmployee(): boolean {
    return this.currentUser?.role === 'employee' || this.currentUser?.role === 'admin';
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            cpf: data.cpf,
            phone: data.phone
          }
        }
      });

      if (error) throw error;

      // If sign-up returns a user, fetch their profile immediately
      if (authData.user) {
        await this.fetchProfile(authData.user.id);
      }

      return {
        success: true,
        user: this.currentUser || undefined,
        message: 'Cadastro realizado com sucesso!'
      };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { success: false, message: error.message || 'Erro ao criar conta.' };
    }
  }

  async login(credentials: AuthCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) throw error;

      if (data.user) {
        await this.fetchProfile(data.user.id);
      }

      if (this.currentUser && !this.currentUser.isActive) {
        await this.logout();
        return { success: false, message: 'Conta desativada. Entre em contato com o suporte.' };
      }

      return {
        success: true,
        user: this.currentUser || undefined,
        token: data.session?.access_token,
        message: 'Login realizado com sucesso'
      };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, message: 'E-mail ou senha incorretos' };
    }
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut();
    this.currentUser = null;
    this.session = null;
    localStorage.removeItem('cart');
  }

  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { success: true, message: 'Se o e-mail existir, você receberá instruções de recuperação.' };
    } catch (error) {
      console.error('Password reset request error:', error);
      return { success: false, message: 'Erro ao solicitar recuperação de senha.' };
    }
  }

  async updateProfile(userId: string, data: Partial<User>): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: data.name,
          cpf: data.cpf,
          phone: data.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      await this.fetchProfile(userId);

      return {
        success: true,
        message: 'Perfil atualizado com sucesso',
        user: this.currentUser || undefined
      };
    } catch (error: any) {
      console.error('Update profile error:', error);
      return { success: false, message: error.message || 'Erro ao atualizar perfil' };
    }
  }

  // Address management
  async addAddress(userId: string, address: any): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      const addresses = [...(this.currentUser?.addresses || []), { ...address, id: crypto.randomUUID() }];

      const { error } = await supabase
        .from('profiles')
        .update({ addresses })
        .eq('id', userId);

      if (error) throw error;
      await this.fetchProfile(userId);

      return { success: true, message: 'Endereço adicionado com sucesso', user: this.currentUser || undefined };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async deleteAddress(userId: string, addressId: string): Promise<{ success: boolean; message: string }> {
    try {
      const addresses = (this.currentUser?.addresses || []).filter(a => a.id !== addressId);

      const { error } = await supabase
        .from('profiles')
        .update({ addresses })
        .eq('id', userId);

      if (error) throw error;
      await this.fetchProfile(userId);

      return { success: true, message: 'Endereço removido com sucesso' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<{ success: boolean; message: string }> {
    try {
      const addresses = (this.currentUser?.addresses || []).map(a => ({
        ...a,
        isDefault: a.id === addressId
      }));

      const { error } = await supabase
        .from('profiles')
        .update({ addresses })
        .eq('id', userId);

      if (error) throw error;
      await this.fetchProfile(userId);

      return { success: true, message: 'Endereço padrão atualizado' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  // Employee management
  async getAllEmployees(): Promise<User[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['employee', 'admin']);

    if (error) throw error;
    return (data || []).map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      cpf: u.cpf,
      phone: u.phone,
      addresses: u.addresses || [],
      role: u.role,
      isActive: u.is_active,
      createdAt: u.created_at,
      updatedAt: u.updated_at
    }));
  }

  async createEmployee(data: any): Promise<{ success: boolean; message?: string }> {
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            phone: data.phone,
            role: 'employee'
          }
        }
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async toggleUserStatus(userId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('is_active')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_active: !profile.is_active })
        .eq('id', userId);

      if (updateError) throw updateError;
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}

export const auth = new AuthService();
