
import React from 'react';
import { GraduationCap, BookOpen, Users, DollarSign, Plus, LayoutGrid, MoreHorizontal } from 'lucide-react';

const MembershipPortal: React.FC = () => {
  const courses = [
    { title: 'Marketing Mastery 101', students: 452, lessons: 24, revenue: 8400 },
    { title: 'Advanced Automation Workflows', students: 128, lessons: 12, revenue: 12500 },
  ];

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Memberships</h2>
          <p className="text-slate-500 text-sm">Create and host courses, digital products, and communities</p>
        </div>
        <button className="px-6 py-3 bg-brand text-white rounded-xl font-semibold shadow-lg flex items-center gap-2">
          <Plus className="w-5 h-5" /> Create Course
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
           <p className="text-xs font-medium text-slate-400 mb-1">Total Students</p>
           <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-brand" />
              <span className="text-3xl font-semibold text-slate-900">580</span>
           </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
           <p className="text-xs font-medium text-slate-400 mb-1">Membership Revenue</p>
           <div className="flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-emerald-500" />
              <span className="text-3xl font-semibold text-slate-900">$20,900</span>
           </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
           <p className="text-xs font-medium text-slate-400 mb-1">Active Products</p>
           <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-indigo-500" />
              <span className="text-3xl font-semibold text-slate-900">4</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {courses.map(course => (
          <div key={course.title} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
             <div className="h-32 bg-slate-100 relative overflow-hidden">
                <div className="absolute inset-0 bg-brand/5 group-hover:bg-brand/10 transition-colors"></div>
                <GraduationCap className="absolute bottom-4 right-4 w-12 h-12 text-brand/20" />
             </div>
             <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                   <h4 className="text-lg font-semibold text-slate-900">{course.title}</h4>
                   <button className="p-2 text-slate-400 hover:text-slate-900"><MoreHorizontal className="w-5 h-5" /></button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                   <div>
                      <p className="text-xs font-medium text-slate-400">Students</p>
                      <p className="font-semibold text-slate-700">{course.students}</p>
                   </div>
                   <div>
                      <p className="text-xs font-medium text-slate-400">Lessons</p>
                      <p className="font-semibold text-slate-700">{course.lessons}</p>
                   </div>
                   <div>
                      <p className="text-xs font-medium text-slate-400">Revenue</p>
                      <p className="font-semibold text-emerald-600">${course.revenue.toLocaleString()}</p>
                   </div>
                </div>
                <button className="w-full mt-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                   Edit Content <LayoutGrid className="w-4 h-4" />
                </button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MembershipPortal;
