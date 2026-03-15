
// src/lib/db/staff.ts
import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';
import type { StaffMember, StaffRole } from '@/context/staff-context';
import { initialStaff } from './data'; // For password check fallback
import fs from 'fs';

const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'temeh.db');
let dbInstance: Database.Database | null = null;

function getDb(): Database.Database {
  if (dbInstance && dbInstance.open) {
    return dbInstance;
  }

  const dbExists = fs.existsSync(dbPath);
  const db = new Database(dbPath);

  if (!dbExists) {
    console.log("Database file not found, creating and initializing schema...");
    const schema = fs.readFileSync(path.join(process.cwd(), 'docs', 'database.md'), 'utf8');
    const sqlOnly = schema.split('```sql')[1].split('```')[0];
    db.exec(sqlOnly);
    console.log("Database schema initialized.");
  }

  dbInstance = db;
  return db;
}

export async function getStaff(): Promise<StaffMember[]> {
  const db = getDb();
  try {
    const stmt = db.prepare('SELECT id, name, email, role, status, avatar, floor, phone, hire_date, force_password_change, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone FROM users');
    const rows = stmt.all() as any[];
    return rows.map(row => ({
      ...row,
      id: String(row.id),
      hireDate: row.hire_date ? new Date(row.hire_date) : undefined,
      emergency_contact_name: row.emergency_contact_name,
      emergency_contact_relationship: row.emergency_contact_relationship,
      emergency_contact_phone: row.emergency_contact_phone
    }));
  } finally {
    // No close
  }
}

export async function getStaffByEmail(email: string): Promise<StaffMember | undefined> {
  const db = getDb();
  try {
    const stmt = db.prepare('SELECT id, name, email, role, status, avatar, floor, phone, hire_date, force_password_change, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone FROM users WHERE email = ?');
    const row = stmt.get(email) as any;
    if (!row) return undefined;
    return {
      ...row,
      id: String(row.id),
      hireDate: row.hire_date ? new Date(row.hire_date) : undefined,
      emergency_contact_name: row.emergency_contact_name,
      emergency_contact_relationship: row.emergency_contact_relationship,
      emergency_contact_phone: row.emergency_contact_phone
    };
  } finally {
    // No close
  }
}

export async function verifyPassword(email: string, password_to_check: string): Promise<boolean> {
  const db = getDb();
  try {
    const row = db.prepare('SELECT password FROM users WHERE email = ?').get(email) as { password?: string } | undefined;
    if (!row || !row.password) {
      // Fallback for initial seed before hashing
      const seededUser = initialStaff.find(u => u.email === email);
      return seededUser ? password_to_check === 'password' : false;
    }
    return await bcrypt.compare(password_to_check, row.password);
  } catch (e) {
    console.error("Password verification error:", e);
    return false;
  } finally {
    // No close
  }
}

export async function addStaff(staffData: Omit<StaffMember, 'id' | 'status' | 'avatar'>): Promise<StaffMember> {
  const db = getDb();
  try {
    const password = '12345678'; // Default password, communicated to admin via toast
    const hashedPassword = await bcrypt.hash(password, 10);

    const newStaff: Omit<StaffMember, 'id'> = {
      ...staffData,
      status: 'Active',
      avatar: 'https://placehold.co/100x100.png',
      force_password_change: 1,
    };

    const stmt = db.prepare(`
      INSERT INTO users (name, email, password, role, status, avatar, floor, phone, hire_date, force_password_change, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone) 
      VALUES (@name, @email, @password, @role, @status, @avatar, @floor, @phone, @hire_date, @force_password_change, @emergency_contact_name, @emergency_contact_relationship, @emergency_contact_phone)
    `);

    const info = stmt.run({
      name: newStaff.name,
      email: newStaff.email,
      password: hashedPassword,
      role: newStaff.role,
      status: newStaff.status,
      avatar: newStaff.avatar,
      floor: newStaff.floor || null,
      phone: newStaff.phone || null,
      hire_date: newStaff.hireDate ? new Date(newStaff.hireDate).toISOString().split('T')[0] : null,
      force_password_change: newStaff.force_password_change,
      emergency_contact_name: newStaff.emergency_contact_name || null,
      emergency_contact_relationship: newStaff.emergency_contact_relationship || null,
      emergency_contact_phone: newStaff.emergency_contact_phone || null
    });

    return { ...newStaff, id: String(info.lastInsertRowid) } as StaffMember;
  } finally {
    // No close
  }
}

export async function updateStaff(email: string, updatedStaff: Partial<StaffMember>): Promise<StaffMember> {
  const db = getDb();
  try {
    const existingStaff = await getStaffByEmail(email);
    if (!existingStaff) {
      throw new Error("Staff member not found");
    }

    const finalStaff = { ...existingStaff, ...updatedStaff };

    const stmt = db.prepare(`
      UPDATE users 
      SET name = @name, role = @role, status = @status, avatar = @avatar, floor = @floor, phone = @phone, hire_date = @hire_date, force_password_change = @force_password_change,
          emergency_contact_name = @emergency_contact_name, emergency_contact_relationship = @emergency_contact_relationship, emergency_contact_phone = @emergency_contact_phone
      WHERE email = @email
    `);

    stmt.run({
      name: finalStaff.name,
      role: finalStaff.role,
      status: finalStaff.status,
      avatar: finalStaff.avatar,
      floor: finalStaff.floor || null,
      phone: finalStaff.phone || null,
      hire_date: finalStaff.hireDate ? new Date(finalStaff.hireDate).toISOString().split('T')[0] : null,
      force_password_change: finalStaff.force_password_change,
      emergency_contact_name: finalStaff.emergency_contact_name || null,
      emergency_contact_relationship: finalStaff.emergency_contact_relationship || null,
      emergency_contact_phone: finalStaff.emergency_contact_phone || null,
      email: email
    });
    return finalStaff;
  } finally {
    // No close
  }
}

export async function deleteStaff(email: string): Promise<{ email: string }> {
  const db = getDb();
  
  // Get the user ID first
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: number } | undefined;
  
  if (!user) {
    throw new Error("Staff member not found");
  }

  const userId = user.id;

  const deleteTransaction = db.transaction(() => {
    // 1. Delete records in user-specific tables that don't need to be preserved
    db.prepare('DELETE FROM user_settings WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM notes WHERE user_id = ?').run(userId);
    
    // 2. Nullify references in audit/historical tables to preserve data integrity
    // Orders & Payments
    db.prepare('UPDATE orders SET cashier_id = NULL WHERE cashier_id = ?').run(userId);
    db.prepare('UPDATE orders SET cancelled_by = NULL WHERE cancelled_by = ?').run(userId);
    db.prepare('UPDATE payments SET cashier_id = NULL WHERE cashier_id = ?').run(userId);
    
    // Activity Logs & Carts
    db.prepare('UPDATE activity_logs SET user_id = NULL WHERE user_id = ?').run(userId);
    db.prepare('UPDATE held_carts SET user_id = NULL WHERE user_id = ?').run(userId);
    db.prepare('UPDATE saved_orders SET saved_by = NULL WHERE saved_by = ?').run(userId);
    
    // Tickets
    db.prepare('UPDATE tickets SET creator_id = NULL WHERE creator_id = ?').run(userId);
    db.prepare('UPDATE tickets SET assignee_id = NULL WHERE assignee_id = ?').run(userId);
    db.prepare('UPDATE ticket_comments SET author_id = NULL WHERE author_id = ?').run(userId);
    
    // Financial/Inventory
    db.prepare('UPDATE expenses SET user_id = NULL WHERE user_id = ?').run(userId);
    db.prepare('UPDATE inventory_movements SET user_id = NULL WHERE user_id = ?').run(userId);
    
    // Payroll (Nullify to keep historical records of who was paid or who approved)
    db.prepare('UPDATE payroll_advances SET employee_id = NULL WHERE employee_id = ?').run(userId);
    db.prepare('UPDATE payroll_advances SET approved_by = NULL WHERE approved_by = ?').run(userId);
    db.prepare('UPDATE payroll_salaries SET employee_id = NULL WHERE employee_id = ?').run(userId);
    db.prepare('UPDATE payroll_payouts SET employee_id = NULL WHERE employee_id = ?').run(userId);
    db.prepare('UPDATE payroll_payouts SET processed_by = NULL WHERE processed_by = ?').run(userId);

    // 3. Finally delete the user
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  });

  try {
    deleteTransaction();
    return { email };
  } catch (error: any) {
    console.error("Failed to delete staff member:", error);
    throw error;
  }
}

export async function updatePassword(email: string, newPassword: string, forceChange: boolean = false): Promise<void> {
  const db = getDb();
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const forceUpdateVal = forceChange ? 1 : 0;
    db.prepare('UPDATE users SET password = ?, force_password_change = ? WHERE email = ?')
      .run(hashedPassword, forceUpdateVal, email);
  } finally {
    // No close
  }
}
export async function isAppSetup(): Promise<boolean> {
  const db = getDb();
  try {
    const row = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('Super Admin') as { count: number };
    return row.count > 0;
  } catch (e) {
    return false;
  }
}
