import os, re

files_to_check = [
    'src/pages/Admin.jsx',
    'src/pages/Schedule.jsx',
    'src/pages/admin/StockTab.jsx',
    'src/pages/admin/ServiceProductsManager.jsx',
    'src/pages/admin/FinancesTab.jsx',
    'src/pages/admin/BarberUsageModal.jsx'
]

swal_import = """import Swal from 'sweetalert2';

const myConfirm = async (msg) => {
  const result = await Swal.fire({
    title: 'Atenção',
    text: msg,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Sim, confirmar',
    cancelButtonText: 'Cancelar',
    background: 'var(--bg-glass)',
    color: 'var(--text-color)'
  });
  return result.isConfirmed;
};

"""

os.chdir(r"E:\work\SITES\modelo_barbearia")

for fpath in files_to_check:
    if not os.path.exists(fpath): continue
    
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if '!confirm(' not in content:
        continue
        
    print(f"Fixing {fpath}")
    
    # 1) Replace standard confirm calls with sweetalert myConfirm
    # Using regex to capture the argument safely:
    # We look for something like: !confirm('Message') or !confirm(`Message`) 
    # and replace with: !(await myConfirm('Message'))
    new_content = re.sub(r'!\s*confirm\s*\((.*?)\)', r'!(await myConfirm(\1))', content)
    
    if new_content != content:
        lines = new_content.split('\n')
        
        # Inject myConfirm right after the last import line
        last_import_idx = 0
        for i, line in enumerate(lines):
            if line.startswith('import '):
                last_import_idx = i
                
        lines.insert(last_import_idx + 1, swal_import)
        
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
        print("Updated " + fpath)
