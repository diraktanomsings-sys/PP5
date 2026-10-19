import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, UserRole } from '../../types/schema';
import {
  Users,
  UserPlus,
  KeyRound,
  CheckCircle2,
  Search,
  Shield,
  ShieldCheck,
  Edit3,
  X,
  Lock,
  UserCheck,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

export const AdminUsers: React.FC = () => {
  const {
    users,
    setUsers,
    currentUser,
    addAuditLog,
    updateUserRoles,
    updateUser,
    adminResetPassword,
    changePassword,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 1. Edit Roles State
  const [editingRolesUser, setEditingRolesUser] = useState<User | null>(null);
  const [editingRoles, setEditingRoles] = useState<UserRole[]>([]);

  // 2. Edit Profile State
  const [editingProfileUser, setEditingProfileUser] = useState<User | null>(null);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    citizen_id: '',
    teacher_id: '',
    email: '',
    department: '',
    is_active: true,
  });

  // 3. Reset Password State
  const [resetPassUser, setResetPassUser] = useState<User | null>(null);
  const [newPassInput, setNewPassInput] = useState('12345678');
  const [showNewPass, setShowNewPass] = useState(false);

  // 4. Admin Self Password Change State
  const [showSelfPassModal, setShowSelfPassModal] = useState(false);
  const [selfCurrentPass, setSelfCurrentPass] = useState('');
  const [selfNewPass, setSelfNewPass] = useState('');
  const [selfConfirmPass, setSelfConfirmPass] = useState('');
  const [selfPassError, setSelfPassError] = useState<string | null>(null);

  // 5. Add User Form state
  const [addCitizenId, setAddCitizenId] = useState('');
  const [addTeacherId, setAddTeacherId] = useState('');
  const [addFullName, setAddFullName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [selectedAddRoles, setSelectedAddRoles] = useState<UserRole[]>(['TEACHER']);
  const [addDepartment, setAddDepartment] = useState('กลุ่มสาระการเรียนรู้ภาษาไทย');

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.full_name.toLowerCase().includes(q) ||
      u.citizen_id.includes(q) ||
      u.teacher_id.toLowerCase().includes(q) ||
      u.department.toLowerCase().includes(q)
    );
  });

  // Toggle roles in Add Modal
  const handleToggleAddRole = (role: UserRole) => {
    if (selectedAddRoles.includes(role)) {
      if (selectedAddRoles.length > 1) {
        setSelectedAddRoles(selectedAddRoles.filter((r) => r !== role));
      }
    } else {
      setSelectedAddRoles([...selectedAddRoles, role]);
    }
  };

  // Toggle roles in Edit Roles Modal
  const handleToggleEditRole = (role: UserRole) => {
    if (editingRoles.includes(role)) {
      if (editingRoles.length > 1) {
        setEditingRoles(editingRoles.filter((r) => r !== role));
      }
    } else {
      setEditingRoles([...editingRoles, role]);
    }
  };

  // Open Edit Roles
  const handleOpenEditRoles = (user: User) => {
    setEditingRolesUser(user);
    setEditingRoles(
      user.assigned_roles && user.assigned_roles.length > 0 ? user.assigned_roles : [user.role]
    );
  };

  // Save Edit Roles
  const handleSaveEditRoles = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRolesUser || editingRoles.length === 0) return;

    updateUserRoles(editingRolesUser.id, editingRoles);
    setSuccessMsg(
      `อัปเดตสิทธิ์บทบาทสำหรับ ${editingRolesUser.full_name} เป็น [${editingRoles.join(', ')}] เรียบร้อยแล้ว`
    );
    setEditingRolesUser(null);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Open Edit Profile
  const handleOpenEditProfile = (user: User) => {
    setEditingProfileUser(user);
    setProfileForm({
      full_name: user.full_name,
      citizen_id: user.citizen_id,
      teacher_id: user.teacher_id,
      email: user.email,
      department: user.department,
      is_active: user.is_active ?? true,
    });
  };

  // Save Edit Profile
  const handleSaveEditProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfileUser) return;

    updateUser(editingProfileUser.id, {
      full_name: profileForm.full_name.trim(),
      citizen_id: profileForm.citizen_id.trim(),
      teacher_id: profileForm.teacher_id.trim(),
      email: profileForm.email.trim(),
      department: profileForm.department,
      is_active: profileForm.is_active,
    });

    setSuccessMsg(`บันทึกการแก้ไขข้อมูลของ ${profileForm.full_name} สำเร็จเรียบร้อย`);
    setEditingProfileUser(null);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Open Reset Password
  const handleOpenResetPassword = (user: User) => {
    setResetPassUser(user);
    setNewPassInput(user.role === 'ADMIN' ? 'admin1234' : '12345678');
  };

  // Save Reset Password
  const handleSaveResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassUser || !newPassInput.trim()) return;

    const res = adminResetPassword(resetPassUser.id, newPassInput.trim());
    if (res.success) {
      setSuccessMsg(
        `รีเซ็ตรหัสผ่านสำหรับ ${resetPassUser.full_name} เป็น "${newPassInput.trim()}" เรียบร้อยแล้ว`
      );
      setResetPassUser(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // Save Admin Self Password
  const handleSaveSelfPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setSelfPassError(null);

    if (!selfCurrentPass) {
      setSelfPassError('กรุณากรอกรหัสผ่านปัจจุบัน');
      return;
    }
    if (!selfNewPass || selfNewPass.length < 6) {
      setSelfPassError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (selfNewPass !== selfConfirmPass) {
      setSelfPassError('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    const res = changePassword(currentUser.id, selfCurrentPass, selfNewPass);
    if (!res.success) {
      setSelfPassError(res.error || 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
    } else {
      setSuccessMsg('เปลี่ยนรหัสผ่านผู้ดูแลระบบตนเองสำเร็จเรียบร้อยแล้ว');
      setShowSelfPassModal(false);
      setSelfCurrentPass('');
      setSelfNewPass('');
      setSelfConfirmPass('');
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // Add User
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCitizenId || !addFullName || selectedAddRoles.length === 0) return;

    const newUser: User = {
      id: `u-${Date.now()}`,
      citizen_id: addCitizenId.trim(),
      teacher_id: addTeacherId.trim() || `T-2569-${Math.floor(Math.random() * 900 + 100)}`,
      full_name: addFullName.trim(),
      email: addEmail.trim() || `${addCitizenId.trim().slice(-4)}@khumuang.ac.th`,
      role: selectedAddRoles[0],
      assigned_roles: selectedAddRoles,
      department: addDepartment,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    setUsers([...users, newUser]);
    addAuditLog({
      action_type: 'USER_ROLE_CHANGED',
      target_id: newUser.id,
      target_name: `เพิ่มผู้ใช้ ${newUser.full_name} (${selectedAddRoles.join(', ')})`,
      details: {
        roles: selectedAddRoles,
        department: newUser.department,
      },
    });

    setShowAddUserModal(false);
    setSuccessMsg(`เพิ่มผู้ใช้งาน ${addFullName} พร้อมสิทธิ์ [${selectedAddRoles.join(', ')}] สำเร็จ!`);
    setTimeout(() => setSuccessMsg(null), 3000);

    setAddCitizenId('');
    setAddTeacherId('');
    setAddFullName('');
    setAddEmail('');
    setSelectedAddRoles(['TEACHER']);
  };

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'TEACHER':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'REVIEWER':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'EXECUTIVE':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'ADMIN':
        return 'bg-slate-800 text-slate-100 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs font-bold text-blue-900 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Role-Based Access Control (RBAC) Governance</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            จัดการข้อมูลบุคลากรและสิทธิ์ (Users & RBAC Management)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            แก้ไขข้อมูลบุคลากร มอบหมายสิทธิ์ Single/Multi-Role รีเซ็ตรหัสผ่าน และเปลี่ยนรหัสผ่านตนเอง
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Admin Change Self Password Button */}
          <button
            onClick={() => {
              setSelfPassError(null);
              setSelfCurrentPass('');
              setSelfNewPass('');
              setSelfConfirmPass('');
              setShowSelfPassModal(true);
            }}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer border border-slate-700"
            title="เปลี่ยนรหัสผ่านผู้ดูแลระบบตนเอง"
          >
            <KeyRound className="w-4 h-4 text-amber-300" />
            <span>เปลี่ยนรหัสผ่านแอดมินตนเอง</span>
          </button>

          {/* Add User Button */}
          <button
            onClick={() => setShowAddUserModal(true)}
            className="px-3.5 py-2 bg-[#00236f] hover:bg-blue-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ เพิ่มบุคลากรใหม่</span>
          </button>
        </div>
      </div>


      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {/* Search and Count */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, เลข ปชช., รหัสครู, กลุ่มสาระ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>
        <div className="text-xs text-slate-500">
          บุคลากรทั้งหมด <strong>{filteredUsers.length}</strong> ท่าน
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">รหัสครู</th>
                <th className="px-4 py-3">ชื่อ - นามสกุล</th>
                <th className="px-4 py-3 font-mono">เลขประจำตัวประชาชน (13 หลัก)</th>
                <th className="px-4 py-3">กลุ่มสาระการเรียนรู้ / ฝ่าย</th>
                <th className="px-4 py-3 text-center">สิทธิ์ที่ได้รับมอบหมาย</th>
                <th className="px-4 py-3 text-right">การจัดการข้อมูล & รหัสผ่าน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => {
                const roles =
                  u.assigned_roles && u.assigned_roles.length > 0 ? u.assigned_roles : [u.role];
                const isMultiRole = roles.length > 1;

                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-700 font-medium">
                      {u.teacher_id}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      <div>{u.full_name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{u.email}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {u.citizen_id.length === 13
                        ? `${u.citizen_id.slice(0, 1)}-${u.citizen_id.slice(1, 5)}-${u.citizen_id.slice(5, 10)}-${u.citizen_id.slice(10, 12)}-${u.citizen_id.slice(12)}`
                        : u.citizen_id}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{u.department}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-1">
                        {roles.map((r) => (
                          <span
                            key={r}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRoleBadge(
                              r
                            )}`}
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-1">
                        {isMultiRole ? '✓ หลายบทบาท (Multi-Role)' : '✓ บทบาทเดียว'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 1. Edit User Info */}
                        <button
                          onClick={() => handleOpenEditProfile(u)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer border border-slate-200"
                          title="แก้ไขข้อมูลบุคลากร (ชื่อ, เลข ปชช., รหัสครู, ฝ่าย)"
                        >
                          <Edit3 className="w-3 h-3 text-slate-600" />
                          <span>แก้ไขข้อมูล</span>
                        </button>

                        {/* 2. Edit RBAC Roles */}
                        <button
                          onClick={() => handleOpenEditRoles(u)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer border border-blue-200"
                          title="ปรับปรุงสิทธิ์บทบาท RBAC"
                        >
                          <Shield className="w-3 h-3 text-blue-600" />
                          <span>กำหนดสิทธิ์</span>
                        </button>

                        {/* 3. Reset Password */}
                        <button
                          onClick={() => handleOpenResetPassword(u)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer border border-amber-200"
                          title="ตั้งหรือรีเซ็ตรหัสผ่านสำหรับบุคลากรนี้"
                        >
                          <KeyRound className="w-3 h-3 text-amber-600" />
                          <span>รหัสผ่าน</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Edit Profile (Full Personnel Information) */}
      {editingProfileUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-700" />
                <h4 className="text-base font-bold text-slate-900">
                  แก้ไขข้อมูลบุคลากร (Edit Personnel Profile)
                </h4>
              </div>
              <button
                onClick={() => setEditingProfileUser(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ชื่อ - นามสกุล *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.full_name}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, full_name: e.target.value })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    เลขประจำตัวประชาชน (13 หลัก) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={13}
                    value={profileForm.citizen_id}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, citizen_id: e.target.value })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    รหัสประจำตัวครู/บุคลากร *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.teacher_id}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, teacher_id: e.target.value })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    อีเมลทางการศึกษา
                  </label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, email: e.target.value })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  กลุ่มสาระการเรียนรู้ / ฝ่ายงาน
                </label>
                <select
                  value={profileForm.department}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, department: e.target.value })
                  }
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="กลุ่มสาระการเรียนรู้ภาษาไทย">กลุ่มสาระฯ ภาษาไทย</option>
                  <option value="กลุ่มสาระการเรียนรู้คณิตศาสตร์">กลุ่มสาระฯ คณิตศาสตร์</option>
                  <option value="กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี">
                    กลุ่มสาระฯ วิทยาศาสตร์และเทคโนโลยี
                  </option>
                  <option value="กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนา และวัฒนธรรม">
                    กลุ่มสาระฯ สังคมศึกษาฯ
                  </option>
                  <option value="กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ">
                    กลุ่มสาระฯ ภาษาต่างประเทศ
                  </option>
                  <option value="กลุ่มสาระการเรียนรู้ศิลปะ">กลุ่มสาระฯ ศิลปะ</option>
                  <option value="กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา">
                    กลุ่มสาระฯ สุขศึกษาและพลศึกษา
                  </option>
                  <option value="กลุ่มงานทะเบียนและวัดผลการศึกษา">
                    กลุ่มงานทะเบียนและวัดผลการศึกษา
                  </option>
                  <option value="กลุ่มงานสารสนเทศและทะเบียนวัดผล">
                    กลุ่มงานสารสนเทศและทะเบียนวัดผล
                  </option>
                  <option value="ฝ่ายบริหารสถานศึกษา">ฝ่ายบริหารสถานศึกษา</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="userActiveCheck"
                  checked={profileForm.is_active}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, is_active: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded border-slate-300"
                />
                <label htmlFor="userActiveCheck" className="font-semibold text-slate-700 cursor-pointer">
                  เปิดใช้งานบัญชีบุคลากรนี้ในระบบ (Active Account)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProfileUser(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00236f] hover:bg-blue-900 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  บันทึกการเปลี่ยนแปลง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Roles Modal */}
      {editingRolesUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <h4 className="text-base font-bold text-slate-900">กำหนดสิทธิ์และบทบาท (RBAC)</h4>
              </div>
              <button
                onClick={() => setEditingRolesUser(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <p className="font-bold text-slate-800">{editingRolesUser.full_name}</p>
              <p className="text-slate-500">
                {editingRolesUser.department} · {editingRolesUser.teacher_id}
              </p>
            </div>

            <form onSubmit={handleSaveEditRoles} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-2">
                  เลือกบทบาทที่มอบหมายให้ผู้ใช้นี้ (เลือกได้มากกว่า 1 ข้อ):
                </label>
                <div className="space-y-2">
                  {(['TEACHER', 'REVIEWER', 'EXECUTIVE', 'ADMIN'] as UserRole[]).map((r) => {
                    const isChecked = editingRoles.includes(r);
                    return (
                      <label
                        key={r}
                        onClick={() => handleToggleEditRole(r)}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'border-blue-600 bg-blue-50/80 font-bold text-blue-950'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300"
                          />
                          <div>
                            <div>
                              {r === 'TEACHER' && 'TEACHER (ครูผู้สอน)'}
                              {r === 'REVIEWER' && 'REVIEWER (ผู้ตรวจเอกสาร)'}
                              {r === 'EXECUTIVE' && 'EXECUTIVE (ผู้อำนวยการ/ผู้บริหาร)'}
                              {r === 'ADMIN' && 'ADMIN (ผู้ดูแลระบบ)'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              {r === 'TEACHER' && 'บันทึกคะแนน ส่ง ปพ.5'}
                              {r === 'REVIEWER' && 'ตรวจเกณฑ์ 4 ด้าน'}
                              {r === 'EXECUTIVE' && 'ลงนาม e-Signature อนุมัติ'}
                              {r === 'ADMIN' && 'จัดการระบบ หลักสูตร และผู้ใช้'}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRoleBadge(
                            r
                          )}`}
                        >
                          {r}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                * หากเลือกมากกว่า 1 บทบาท เมื่อผู้ใช้เข้าสู่ระบบ
                จะแสดงหน้าจอให้เลือกบทบาทการปฏิบัติงาน (Multi-Role Picker)
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRolesUser(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00236f] hover:bg-blue-900 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  บันทึกสิทธิ์ RBAC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Reset / Set Password for User */}
      {resetPassUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                <h4 className="text-base font-bold text-slate-900">ตั้ง/รีเซ็ตรหัสผ่าน</h4>
              </div>
              <button
                onClick={() => setResetPassUser(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <p className="font-bold text-slate-800">{resetPassUser.full_name}</p>
              <p className="text-slate-500">
                รหัสครู: {resetPassUser.teacher_id} · เลข ปชช: {resetPassUser.citizen_id}
              </p>
            </div>

            <form onSubmit={handleSaveResetPassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  กำหนดรหัสผ่านใหม่ *
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    value={newPassInput}
                    onChange={(e) => setNewPassInput(e.target.value)}
                    placeholder="ระบุรหัสผ่านใหม่"
                    className="w-full pl-3 pr-10 py-2.5 border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setNewPassInput(resetPassUser.role === 'ADMIN' ? 'admin1234' : '12345678')
                  }
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium transition-colors"
                >
                  ใช้ค่ามาตรฐาน ({resetPassUser.role === 'ADMIN' ? 'admin1234' : '12345678'})
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetPassUser(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  บันทึกรหัสผ่านใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Admin Self Password Change */}
      {showSelfPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-700" />
                <h4 className="text-base font-bold text-slate-900">
                  เปลี่ยนรหัสผ่านผู้ดูแลระบบตนเอง
                </h4>
              </div>
              <button
                onClick={() => setShowSelfPassModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selfPassError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{selfPassError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSelfPassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  รหัสผ่านปัจจุบัน *
                </label>
                <input
                  type="password"
                  required
                  value={selfCurrentPass}
                  onChange={(e) => setSelfCurrentPass(e.target.value)}
                  placeholder="กรอกรหัสผ่านปัจจุบัน"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  รหัสผ่านใหม่ *
                </label>
                <input
                  type="password"
                  required
                  value={selfNewPass}
                  onChange={(e) => setSelfNewPass(e.target.value)}
                  placeholder="ความยาวอย่างน้อย 6 ตัวอักษร"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ยืนยันรหัสผ่านใหม่ *
                </label>
                <input
                  type="password"
                  required
                  value={selfConfirmPass}
                  onChange={(e) => setSelfConfirmPass(e.target.value)}
                  placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSelfPassModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00236f] hover:bg-blue-900 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  บันทึกรหัสผ่านใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-700" />
                <span>เพิ่มข้อมูลบุคลากรใหม่</span>
              </h4>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ชื่อ - นามสกุล *
                  </label>
                  <input
                    type="text"
                    required
                    value={addFullName}
                    onChange={(e) => setAddFullName(e.target.value)}
                    placeholder="เช่น ครูสมหมาย ใจดี"
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    เลขประจำตัวประชาชน (13 หลัก) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={13}
                    value={addCitizenId}
                    onChange={(e) => setAddCitizenId(e.target.value)}
                    placeholder="เลข 13 หลัก"
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    รหัสประจำตัวครู
                  </label>
                  <input
                    type="text"
                    value={addTeacherId}
                    onChange={(e) => setAddTeacherId(e.target.value)}
                    placeholder="เช่น T-2569-099"
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">อีเมลติดต่อ</label>
                  <input
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="teacher@khumuang.ac.th"
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">กลุ่มสาระการเรียนรู้</label>
                <select
                  value={addDepartment}
                  onChange={(e) => setAddDepartment(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="กลุ่มสาระการเรียนรู้ภาษาไทย">กลุ่มสาระฯ ภาษาไทย</option>
                  <option value="กลุ่มสาระการเรียนรู้คณิตศาสตร์">กลุ่มสาระฯ คณิตศาสตร์</option>
                  <option value="กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี">กลุ่มสาระฯ วิทยาศาสตร์</option>
                  <option value="กลุ่มสาระการเรียนรู้สังคมศึกษาฯ">กลุ่มสาระฯ สังคมศึกษา</option>
                  <option value="กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ">กลุ่มสาระฯ ภาษาต่างประเทศ</option>
                  <option value="กลุ่มงานทะเบียนและวัดผล">กลุ่มงานทะเบียนและวัดผล</option>
                  <option value="ฝ่ายบริหารสถานศึกษา">ฝ่ายบริหารสถานศึกษา</option>
                </select>
              </div>

              {/* Roles Checkboxes */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  กำหนดบทบาทหน้าที่ (เลือกได้มากกว่า 1 สิทธิ์):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['TEACHER', 'REVIEWER', 'EXECUTIVE', 'ADMIN'] as UserRole[]).map((r) => {
                    const isChecked = selectedAddRoles.includes(r);
                    return (
                      <label
                        key={r}
                        onClick={() => handleToggleAddRole(r)}
                        className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                          isChecked
                            ? 'border-blue-600 bg-blue-50/80 font-bold text-blue-900'
                            : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 text-blue-600"
                        />
                        <span className="text-[11px]">{r}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00236f] hover:bg-blue-900 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  บันทึกบุคลากร
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
