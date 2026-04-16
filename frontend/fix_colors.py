import re
import os

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # We want to replace text-white with dark:text-white text-slate-900
    # EXCEPT for elements that have a colored background (like buttons with bg-gradient or badges)
    
    # 1. Dashboard.jsx
    if 'Dashboard.jsx' in filepath:
        # User welcome text
        content = content.replace('<span className="text-white font-semibold">', '<span className="text-slate-900 dark:text-white font-semibold">')
        # Darkmode toggle button hover
        content = content.replace('hover:bg-white/10 text-slate-400 hover:text-white transition-all', 'hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all')
        # Logout button
        content = content.replace('hover:bg-rose-500/20 text-slate-400 hover:text-rose-400', 'hover:bg-rose-500/20 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400')
        # LayoutDashboard text-indigo-400 -> actually, text-slate-400 is in paragraph below
        content = content.replace('text-slate-400 text-sm mt-1 font-medium', 'text-slate-600 dark:text-slate-400 text-sm mt-1 font-medium')
        content = content.replace('text-slate-400 text-sm font-medium', 'text-slate-600 dark:text-slate-400 text-sm font-medium')
        content = content.replace('text-slate-400 text-lg', 'text-slate-600 dark:text-slate-400 text-lg')
        
        # Group name
        content = content.replace('text-xl font-bold tracking-tight text-white', 'text-xl font-bold tracking-tight text-slate-900 dark:text-white')
        
        # Expense History / Categories Titles
        content = content.replace('text-xl font-bold m-0 text-white', 'text-xl font-bold m-0 text-slate-900 dark:text-white')
        
        # Cancel button inline style
        content = content.replace("color: 'white', border: '1px solid var(--border)'", "color: 'var(--text-main)', border: '1px solid var(--border)'")

    # 2. GroupDetails.jsx
    if 'GroupDetails.jsx' in filepath:
        # text-slate-400 text-white hover:text-white
        content = content.replace('text-slate-400 hover:text-white', 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white')
        
        # Avatar with bg-slate-800 text-white - keep this one because bg is dark!
        # content = content.replace('bg-slate-800 border-2 border-slate-900 flex items-center justify-center font-bold text-sm text-white', ...)
        
        # Action button hover icon bg-white/5 hover:bg-white/10 text-white
        content = content.replace('bg-white/5 hover:bg-white/10 text-white transition-all', 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-900 dark:text-white transition-all')
        
        # Add Member button border text-white
        content = content.replace('border border-white/10 text-white font-bold', 'border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10')
        
        # Total Expenses big text
        content = content.replace('text-3xl font-black tracking-tighter text-white', 'text-3xl font-black tracking-tighter text-slate-900 dark:text-white')
        
        # Chat message sender style (inline)
        # style={{ background: msg.sender_id === user.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: 'white'
        content = content.replace("color: 'white', padding: '10px", "color: msg.sender_id === user.id ? '#fff' : 'var(--text-main)', padding: '10px")
        
        # Activity log member text name text-white -> wait let's use text-slate-900 dark:text-white, not exactly here, let's just do text-[var(--text-main)]
        content = content.replace('text-white font-bold', 'text-slate-900 dark:text-white font-bold')
        
    with open(filepath, 'w') as f:
        f.write(content)

fix_file('src/pages/Dashboard.jsx')
fix_file('src/pages/GroupDetails.jsx')

