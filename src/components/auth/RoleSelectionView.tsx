import React from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types/schema';
import {
  GraduationCap,
  CheckSquare,
  ShieldCheck,
  Settings,
  ArrowRight,
  User,
  LogOut,
  Sparkles,
  Info,
} from 'lucide-react';

export const RoleSelectionView: React.FC = () => {
  const { currentUser, selectRole, logout, schoolLogoUrl } = useApp();

  const assignedRoles = currentUser.assigned_roles || [currentUser.role];

  const getRoleCardDetails = (role: UserRole) => {
    switch (role) {
      case 'TEACHER':
        return {
          title: 'ครูผู้สอน (TEACHER)',
          subtitle: 'บันทึกคะแนนและจัดทำเอกสาร ปพ.5',
          description:
            'บันทึกคะแนนเก็บระหว่างภาคและปลายภาค, อัปโหลดไฟล์คู่ (Excel + PDF), ตรวจสอบ Checklist 4 ด้าน และส่งตรวจตามกำหนด',
          icon: GraduationCap,
          borderColor: 'hover:border-blue-500 border-slate-200',
          badgeBg: 'bg-blue-100 text-blue-900 border-blue-200',
          buttonBg: 'bg-[#00236f] hover:bg-blue-900 text-white',
          tasks: [
            'ส่งเล่ม ปพ.5 ฉบับร่างและไฟล์คู่มาตรฐาน',
            'ดูบันทึกข้อเสนอแนะของผู้ตรวจย้อนหลัง',
            'ส่งไฟล์แก้ไขรอบ V002 / V003 ตามจุดบกพร่อง',
          ],
        };
      case 'REVIEWER':
        return {
          title: 'ผู้ตรวจเอกสาร (REVIEWER)',
          subtitle: 'ตรวจสอบความถูกต้องตามหลักสูตร 4 ด้าน',
          description:
            'ตรวจสอบคะแนนตัวชี้วัด, เวลาเรียน 80%, คุณลักษณะ 8 ข้อ, การอ่าน คิดวิเคราะห์ พร้อมระบบป้องกัน Four-Eyes Principle',
          icon: CheckSquare,
          borderColor: 'hover:border-purple-500 border-slate-200',
          badgeBg: 'bg-purple-100 text-purple-900 border-purple-200',
          buttonBg: 'bg-purple-700 hover:bg-purple-800 text-white',
          tasks: [
            'ตรวจสอบความถูกต้องของชีตคะแนนรายคน',
            'ไฮไลต์จุดบกพร่องและส่งกลับแก้ไข (Reject)',
            'รับรองเอกสารส่งต่อผู้อำนวยการลงนาม (Pass)',
          ],
        };
      case 'EXECUTIVE':
        return {
          title: 'ผู้บริหาร / ผู้อำนวยการ (EXECUTIVE)',
          subtitle: 'ลงนามอนุมัติและประทับตรารับรองเล่ม',
          description:
            'ตรวจผลสัมฤทธิ์ภาพรวมโรงเรียน, ลงนามด้วย e-Signature, ประทับตราสถานศึกษา และสร้างรหัสแฮชดิจิทัลล็อกเล่มถาวร',
          icon: ShieldCheck,
          borderColor: 'hover:border-amber-500 border-slate-200',
          badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
          buttonBg: 'bg-amber-600 hover:bg-amber-700 text-white',
          tasks: [
            'Quick Batch Sign ลงนามอนุมัติยกชุด',
            'ประทับตราสถานศึกษาและสร้าง Digital Hash',
            'กำกับตัวชี้วัดความพร้อมของนักเรียนทั้งโรงเรียน',
          ],
        };
      case 'ADMIN':
        return {
          title: 'ผู้ดูแลระบบ (ADMIN)',
          subtitle: 'บริหารจัดการโครงสร้างและธรรมาภิบาลข้อมูล',
          description:
            'จัดการหลักสูตร, จัดการผู้ใช้และสิทธิ์ RBAC, มอบหมายผู้ตรวจตามเกณฑ์ Four-Eyes, ขยายเวลา Deadline, ดูแลคลังและ Audit Log',
          icon: Settings,
          borderColor: 'hover:border-slate-800 border-slate-200',
          badgeBg: 'bg-slate-800 text-white border-slate-700',
          buttonBg: 'bg-slate-900 hover:bg-slate-800 text-white',
          tasks: [
            'วิเคราะห์ Workflow Bottleneck Tracker',
            'Auto-Balance เกลี่ยภาระงานผู้ตรวจ',
            'ตรวจสอบและส่งออกประวัติการทำรายการ',
          ],
        };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#00164e] via-[#00236f] to-slate-900 flex flex-col items-center justify-center p-4 py-8">
      <div className="max-w-3xl w-full bg-white rounded-3xl shadow-2xl border border-blue-200/40 overflow-hidden">
        {/* Header Profile Bar */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-blue-900 to-[#00236f] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white p-1 flex items-center justify-center shrink-0 shadow-md">
              <img
                src={schoolLogoUrl}
                alt="ตราโรงเรียนบ้านคูเมือง"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-blue-200">
                <span className="font-mono bg-blue-800/80 px-2 py-0.5 rounded text-[11px]">
                  {currentUser.teacher_id}
                </span>
                <span>·</span>
                <span>{currentUser.department}</span>
              </div>
              <h2 className="text-xl font-bold mt-1 text-white">สวัสดี, {currentUser.full_name}</h2>
              <p className="text-xs text-blue-100 mt-0.5">
                คุณได้รับมอบหมาย {assignedRoles.length} บทบาทในระบบ ปพ.5 ออนไลน์
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="self-start sm:self-center px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-semibold text-blue-100 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>ออกจากระบบ</span>
          </button>
        </div>

        {/* Selection Content */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-bold text-amber-900 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Multi-Role Access Control (RBAC)</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              เลือกบทบาทการปฏิบัติงานในเซสชันนี้ (Select Operating Role)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              คลิกเลือกบทบาทที่ต้องการเข้าใช้งาน
              แถบเมนูด้านข้างและสิทธิ์การเข้าถึงจะปรับเปลี่ยนตามบทบาทที่เลือกโดยอัตโนมัติ
            </p>
          </div>

          {/* Role Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignedRoles.map((role) => {
              const details = getRoleCardDetails(role);
              const Icon = details.icon;

              return (
                <div
                  key={role}
                  className={`border-2 rounded-2xl p-5 bg-slate-50/50 hover:bg-white transition-all shadow-xs hover:shadow-md flex flex-col justify-between group ${details.borderColor}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-2 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                          <Icon className="w-5 h-5 text-blue-900" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{details.title}</h4>
                          <p className="text-[11px] text-slate-500">{details.subtitle}</p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${details.badgeBg}`}
                      >
                        {role}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed mb-4">
                      {details.description}
                    </p>

                    <div className="space-y-1.5 mb-5 pt-3 border-t border-slate-200/80 text-[11px] text-slate-600">
                      <span className="font-semibold text-slate-800 block text-xs mb-1">
                        ภารกิจหลักที่รับผิดชอบ:
                      </span>
                      {details.tasks.map((task, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <span className="text-blue-600 font-bold">✓</span>
                          <span>{task}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => selectRole(role)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer ${details.buttonBg}`}
                  >
                    <span>เข้าสู่ระบบในฐานะ {role}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Switch Role Hint Notice */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-blue-950">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              <span className="font-bold">เคล็ดลับการใช้งาน:</span> คุณสามารถคลิกสลับบทบาท (Switch
              Role) ได้ตลอดเวลาผ่านเมนูโปรไฟล์บริเวณมุมบนขวาของหน้าจอ
              หรือคลิกปุ่มสลับบทบาทในแถบเมนูด้านข้าง
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
