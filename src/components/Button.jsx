import '../styles/Button.css';

const Button = ({ children, variant = 'primary', onClick, className = '', as: Component = 'button', ...props }) => {
    return (
        <Component
            className={`btn btn-${variant} ${className}`}
            onClick={onClick}
            {...props}
        >
            {children}
        </Component>
    );
};

export default Button;
