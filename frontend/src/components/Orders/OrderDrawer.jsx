import { useState } from 'react';
import { orderService } from '../../services/orderService';
import OrderCart from './OrderCart';
import AddProductToOrder from './AddProductToOrder';
import CustomerSearch from './CustomerSearch';
import useUIStore from '../../store/uiStore';
import { hasEntityValidationErrors, validateOrderDraft } from '../../utils/validators/entityValidators';

export default function OrderDrawer({ isOpen, onClose, onSuccess }) {
  const { showSuccess, showError, showWarning } = useUIStore();
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({ customer: '', orderDate: '', cart: '' });

  const handleAddToCart = (product) => {
    // Check if product already exists in cart
    const existingIndex = cartItems.findIndex(item => item.id === product.id);

    if (existingIndex !== -1) {
      // Update quantity if product exists
      const newItems = [...cartItems];
      const newQuantity = newItems[existingIndex].quantity + product.quantity;

      if (newQuantity > product.stock_quantity) {
        showWarning(`Maksimum ${product.stock_quantity} adet ekleyebilirsiniz`);
        return;
      }

      newItems[existingIndex].quantity = newQuantity;
      setCartItems(newItems);
      setFormErrors((prev) => ({ ...prev, cart: '' }));
    } else {
      // Add new product
      setCartItems([...cartItems, product]);
      setFormErrors((prev) => ({ ...prev, cart: '' }));
    }
  };

  const handleRemoveFromCart = (index) => {
    const newItems = cartItems.filter((_, i) => i !== index);
    setCartItems(newItems);
    setFormErrors((prev) => ({ ...prev, cart: '' }));
  };

  const handleUpdateQuantity = (index, newQuantity) => {
    const newItems = [...cartItems];
    newItems[index].quantity = newQuantity;
    setCartItems(newItems);
    setFormErrors((prev) => ({ ...prev, cart: '' }));
  };

  const handleSubmit = async () => {
    const validationErrors = validateOrderDraft({ selectedCustomer, orderDate, cartItems });
    setFormErrors(validationErrors);
    if (hasEntityValidationErrors(validationErrors)) {
      showWarning('Lütfen sipariş formundaki hataları düzeltin.');
      return;
    }

    setLoading(true);
    try {
      // Prepare order items
      const items = cartItems.map(item => ({
        product_id: Number(item.id),
        quantity: Number(item.quantity),
        price: Number(item.price)
      }));

      const totalAmount = cartItems.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);

      // Create order
      await orderService.create({
        customer_id: Number(selectedCustomer.id || selectedCustomer.customer_id),
        items,
        total_amount: Number(totalAmount.toFixed(2)),
        order_date: orderDate
      });

      showSuccess('Sipariş başarıyla oluşturuldu!');
      handleClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Create order error:', error);
      const validationErrors = error?.response?.data?.errors;
      if (Array.isArray(validationErrors) && validationErrors.length > 0) {
        showError(validationErrors.map((e) => `${e.field}: ${e.message}`).join(' | '));
      } else {
        showError(error.response?.data?.message || 'Sipariş oluşturulamadı');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedCustomer(null);
    setOrderDate(new Date().toISOString().split('T')[0]);
    setCartItems([]);
    setFormErrors({ customer: '', orderDate: '', cart: '' });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-900/20 flex justify-end z-50">
      <div className="bg-white dark:bg-gray-800 w-full max-w-2xl h-full overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">✨ Yeni Sipariş Oluştur</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Customer Selection */}
          <CustomerSearch
            selectedCustomer={selectedCustomer}
            onSelectCustomer={(customer) => {
              setSelectedCustomer(customer);
              setFormErrors((prev) => ({ ...prev, customer: '' }));
            }}
          />
          {formErrors.customer && <p className="text-sm text-red-600 dark:text-red-400">{formErrors.customer}</p>}

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Tarih
            </label>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => {
                setOrderDate(e.target.value);
                setFormErrors((prev) => ({ ...prev, orderDate: '' }));
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700/70 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {formErrors.orderDate && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{formErrors.orderDate}</p>}
          </div>

          {/* Order Cart */}
          <div>
            <OrderCart
              items={cartItems}
              onRemoveItem={handleRemoveFromCart}
              onUpdateQuantity={handleUpdateQuantity}
            />
            {formErrors.cart && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{formErrors.cart}</p>}
          </div>

          {/* Add Product Section */}
          <div>
            <AddProductToOrder onAddToCart={handleAddToCart} />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t p-6 flex space-x-3">
          <button
            onClick={handleClose}
            className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold"
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || cartItems.length === 0}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              loading || cartItems.length === 0
                ? 'bg-gray-300 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? 'Oluşturuluyor...' : '✅ Sipariş Oluştur'}
          </button>
        </div>
      </div>
    </div>
  );
}
