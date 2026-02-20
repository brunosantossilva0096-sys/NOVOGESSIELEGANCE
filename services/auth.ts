import { db } from './database';
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

const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const generateToken = (): string => {
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
};

class AuthService {
  private currentUser: User | null = null;
  private authToken: string | null = null;

  async init(): Promise<void> {
    await db.init();
    // Restore session from localStorage
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    if (storedToken && storedUser) {
      this.authToken = storedToken;
      this.currentUser = JSON.parse(storedUser);
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return !!this.currentUser && !!this.authToken;
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  isEmployee(): boolean {
    return this.currentUser?.role === 'employee' || this.currentUser?.role === 'admin';
  }

  // Employee management (admin only)
  async createEmployee(data: RegisterData): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await db.getUserByEmail(data.email);
      if (existingUser) {
        return { success: false, message: 'Este e-mail já está cadastrado' };
      }

      // Hash password
      const hashedPassword = await hashPassword(data.password);

      // Create employee user
      const newUser: User = {
        id: generateId(),
        name: data.name,
        email: data.email.toLowerCase(),
        password: hashedPassword,
        cpf: data.cpf,
        phone: data.phone,
        birthDate: data.birthDate,
        addresses: [],
        role: 'employee',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.addUser(newUser);

      return {
        success: true,
        user: { ...newUser, password: undefined },
        message: 'Funcionário cadastrado com sucesso'
      };
    } catch (error) {
      console.error('Create employee error:', error);
      return { success: false, message: 'Erro ao cadastrar funcionário. Tente novamente.' };
    }
  }

  async getAllEmployees(): Promise<User[]> {
    try {
      const users = await db.getAllUsers();
      return users.filter(u => u.role === 'employee');
    } catch (error) {
      console.error('Get employees error:', error);
      return [];
    }
  }

  async toggleUserStatus(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await db.getUserById(userId);
      if (!user) {
        return { success: false, message: 'Usuário não encontrado' };
      }

      user.isActive = !user.isActive;
      user.updatedAt = new Date().toISOString();
      await db.updateUser(user);

      return {
        success: true,
        message: user.isActive ? 'Usuário ativado com sucesso' : 'Usuário desativado com sucesso'
      };
    } catch (error) {
      console.error('Toggle user status error:', error);
      return { success: false, message: 'Erro ao alterar status do usuário' };
    }
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await db.getUserByEmail(data.email);
      if (existingUser) {
        return { success: false, message: 'Este e-mail já está cadastrado' };
      }

      // Hash password
      const hashedPassword = await hashPassword(data.password);

      // Create user
      const newUser: User = {
        id: generateId(),
        name: data.name,
        email: data.email.toLowerCase(),
        password: hashedPassword,
        cpf: data.cpf,
        phone: data.phone,
        birthDate: data.birthDate,
        addresses: [],
        role: 'customer',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.addUser(newUser);

      // Auto login after registration
      return this.login({ email: data.email, password: data.password });
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Erro ao criar conta. Tente novamente.' };
    }
  }

  async login(credentials: AuthCredentials): Promise<AuthResponse> {
    try {
      const user = await db.getUserByEmail(credentials.email);

      if (!user) {
        return { success: false, message: 'E-mail ou senha incorretos' };
      }

      if (!user.isActive) {
        return { success: false, message: 'Conta desativada. Entre em contato com o suporte.' };
      }

      const hashedPassword = await hashPassword(credentials.password);

      if (user.password !== hashedPassword) {
        return { success: false, message: 'E-mail ou senha incorretos' };
      }

      // Update last login
      user.lastLogin = new Date().toISOString();
      await db.updateUser(user);

      // Generate token
      const token = generateToken();

      // Save session
      this.currentUser = { ...user, password: undefined };
      this.authToken = token;
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(this.currentUser));

      return {
        success: true,
        user: this.currentUser,
        token,
        message: 'Login realizado com sucesso'
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Erro ao fazer login. Tente novamente.' };
    }
  }

  logout(): void {
    this.currentUser = null;
    this.authToken = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('cart');
  }

  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await db.getUserByEmail(email);

      if (!user) {
        // Don't reveal if user exists for security
        return { success: true, message: 'Se o e-mail existir, você receberá instruções de recuperação.' };
      }

      // Generate reset token
      const resetToken = generateToken();
      const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

      user.resetToken = resetToken;
      user.resetTokenExpiry = resetTokenExpiry;
      await db.updateUser(user);

      // In a real app, send email here
      console.log(`Password reset token for ${email}: ${resetToken}`);

      return { success: true, message: 'Se o e-mail existir, você receberá instruções de recuperação.' };
    } catch (error) {
      console.error('Password reset request error:', error);
      return { success: false, message: 'Erro ao solicitar recuperação de senha.' };
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await db.getUserByResetToken(token);

      if (!user) {
        return { success: false, message: 'Token inválido ou expirado.' };
      }

      // Check if token is expired
      if (user.resetTokenExpiry && new Date(user.resetTokenExpiry) < new Date()) {
        return { success: false, message: 'Token expirado. Solicite uma nova recuperação.' };
      }

      // Update password
      const hashedPassword = await hashPassword(newPassword);
      user.password = hashedPassword;
      user.resetToken = undefined;
      user.resetTokenExpiry = undefined;
      await db.updateUser(user);

      return { success: true, message: 'Senha alterada com sucesso!' };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, message: 'Erro ao alterar senha.' };
    }
  }

  async updateProfile(userId: string, data: Partial<User>): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      const user = await db.getUserById(userId);
      if (!user) {
        return { success: false, message: 'Usuário não encontrado' };
      }

      // Don't allow updating sensitive fields
      delete data.id;
      delete data.password;
      delete data.role;
      delete data.resetToken;
      delete data.resetTokenExpiry;

      const updatedUser = { ...user, ...data, updatedAt: new Date().toISOString() };
      await db.updateUser(updatedUser);

      // Update current user if it's the same user
      if (this.currentUser?.id === userId) {
        this.currentUser = { ...updatedUser, password: undefined };
        localStorage.setItem('auth_user', JSON.stringify(this.currentUser));
      }

      return {
        success: true,
        message: 'Perfil atualizado com sucesso',
        user: { ...updatedUser, password: undefined }
      };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, message: 'Erro ao atualizar perfil' };
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await db.getUserById(userId);
      if (!user || !user.password) {
        return { success: false, message: 'Usuário não encontrado' };
      }

      const hashedCurrentPassword = await hashPassword(currentPassword);
      if (user.password !== hashedCurrentPassword) {
        return { success: false, message: 'Senha atual incorreta' };
      }

      const hashedNewPassword = await hashPassword(newPassword);
      user.password = hashedNewPassword;
      user.updatedAt = new Date().toISOString();
      await db.updateUser(user);

      return { success: true, message: 'Senha alterada com sucesso' };
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, message: 'Erro ao alterar senha' };
    }
  }

  // Address management
  async addAddress(userId: string, address: Omit<import('../types').Address, 'id'>): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      const user = await db.getUserById(userId);
      if (!user) {
        return { success: false, message: 'Usuário não encontrado' };
      }

      const newAddress = {
        ...address,
        id: generateId(),
        isDefault: user.addresses.length === 0 // First address is default
      };

      user.addresses.push(newAddress);
      user.updatedAt = new Date().toISOString();
      await db.updateUser(user);

      // Update current user
      if (this.currentUser?.id === userId) {
        this.currentUser = { ...user, password: undefined };
        localStorage.setItem('auth_user', JSON.stringify(this.currentUser));
      }

      return {
        success: true,
        message: 'Endereço adicionado com sucesso',
        user: { ...user, password: undefined }
      };
    } catch (error) {
      console.error('Add address error:', error);
      return { success: false, message: 'Erro ao adicionar endereço' };
    }
  }

  async updateAddress(userId: string, addressId: string, data: Partial<import('../types').Address>): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      const user = await db.getUserById(userId);
      if (!user) {
        return { success: false, message: 'Usuário não encontrado' };
      }

      const addressIndex = user.addresses.findIndex(a => a.id === addressId);
      if (addressIndex === -1) {
        return { success: false, message: 'Endereço não encontrado' };
      }

      user.addresses[addressIndex] = { ...user.addresses[addressIndex], ...data };
      user.updatedAt = new Date().toISOString();
      await db.updateUser(user);

      // Update current user
      if (this.currentUser?.id === userId) {
        this.currentUser = { ...user, password: undefined };
        localStorage.setItem('auth_user', JSON.stringify(this.currentUser));
      }

      return {
        success: true,
        message: 'Endereço atualizado com sucesso',
        user: { ...user, password: undefined }
      };
    } catch (error) {
      console.error('Update address error:', error);
      return { success: false, message: 'Erro ao atualizar endereço' };
    }
  }

  async deleteAddress(userId: string, addressId: string): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      const user = await db.getUserById(userId);
      if (!user) {
        return { success: false, message: 'Usuário não encontrado' };
      }

      user.addresses = user.addresses.filter(a => a.id !== addressId);
      user.updatedAt = new Date().toISOString();
      await db.updateUser(user);

      // Update current user
      if (this.currentUser?.id === userId) {
        this.currentUser = { ...user, password: undefined };
        localStorage.setItem('auth_user', JSON.stringify(this.currentUser));
      }

      return {
        success: true,
        message: 'Endereço removido com sucesso',
        user: { ...user, password: undefined }
      };
    } catch (error) {
      console.error('Delete address error:', error);
      return { success: false, message: 'Erro ao remover endereço' };
    }
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      const user = await db.getUserById(userId);
      if (!user) {
        return { success: false, message: 'Usuário não encontrado' };
      }

      user.addresses = user.addresses.map(a => ({
        ...a,
        isDefault: a.id === addressId
      }));
      user.updatedAt = new Date().toISOString();
      await db.updateUser(user);

      // Update current user
      if (this.currentUser?.id === userId) {
        this.currentUser = { ...user, password: undefined };
        localStorage.setItem('auth_user', JSON.stringify(this.currentUser));
      }

      return {
        success: true,
        message: 'Endereço padrão atualizado',
        user: { ...user, password: undefined }
      };
    } catch (error) {
      console.error('Set default address error:', error);
      return { success: false, message: 'Erro ao definir endereço padrão' };
    }
  }
}

export const auth = new AuthService();
