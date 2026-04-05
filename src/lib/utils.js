import Swal from 'sweetalert2';

/**
 * Standard confirmation dialog for the administrative panel.
 * @param {string} msg - Message to display.
 * @returns {Promise<boolean>} - True if confirmed, false otherwise.
 */
export const myConfirm = async (msg) => {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const result = await Swal.fire({
        title: 'Confirmação',
        text: msg,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, confirmou!',
        cancelButtonText: 'Cancelar',
        background: isDark ? '#1e2433' : '#ffffff',
        color: isDark ? '#f8fafc' : '#1e293b',
        iconColor: '#ff7a00',
        customClass: {
            popup: 'admin-swal-popup',
            confirmButton: 'admin-swal-confirm',
            cancelButton: 'admin-swal-cancel',
        },
        buttonsStyling: false
    });
    return result.isConfirmed;
};

/**
 * Standard success alert.
 */
export const myAlert = async (title, text, type = 'success') => {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    return Swal.fire({
        title,
        text,
        icon: type,
        background: isDark ? '#1e2433' : '#ffffff',
        color: isDark ? '#f8fafc' : '#1e293b',
        timer: 2500,
        showConfirmButton: false,
    });
};
