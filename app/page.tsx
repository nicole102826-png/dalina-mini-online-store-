"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Product = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  image_url: string | null;
};

type CartItem = Product & {
  quantity: number;
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [customerName, setCustomerName] = useState("");
  const [customerPhonenumber, setCustomerPhonenumber] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  const [orderMessage, setOrderMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">(
    ""
  );
  const [submitting, setSubmitting] = useState(false);

  // Load products from Supabase
  useEffect(() => {
    async function loadProducts() {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("id", { ascending: true });

        if (error) {
          console.error("Error loading products:", error);
          setOrderMessage(
            "Unable to load products. Please check your Supabase connection."
          );
          setMessageType("error");
        } else {
          setProducts((data ?? []) as Product[]);
        }
      } catch (error) {
        console.error("Unexpected product loading error:", error);
        setOrderMessage("Something went wrong while loading products.");
        setMessageType("error");
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  // Add a product to the cart
  function addToCart(product: Product) {
    if (product.stock <= 0) {
      setOrderMessage("Sorry, this product is out of stock.");
      setMessageType("error");
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);

      if (existing) {
        if (existing.quantity >= product.stock) {
          setOrderMessage("You have reached the available stock limit.");
          setMessageType("error");
          return current;
        }

        return current.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...current, { ...product, quantity: 1 }];
    });

    setOrderMessage("");
    setMessageType("");
  }

  // Increase quantity
  function increaseQuantity(id: number) {
    setCart((current) =>
      current.map((item) => {
        if (item.id !== id) return item;

        if (item.quantity >= item.stock) {
          setOrderMessage("You have reached the available stock limit.");
          setMessageType("error");
          return item;
        }

        return { ...item, quantity: item.quantity + 1 };
      })
    );
  }

  // Decrease quantity
  function decreaseQuantity(id: number) {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  // Remove a product from the cart
  function removeFromCart(id: number) {
    setCart((current) => current.filter((item) => item.id !== id));
  }

  // Calculate cart totals
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const totalPrice = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  // Submit order through the existing API
  async function submitOrder() {
    if (cart.length === 0) {
      setOrderMessage("Please add a product to your cart first.");
      setMessageType("error");
      return;
    }

    if (
      !customerName.trim() ||
      !customerPhonenumber.trim() ||
      !customerAddress.trim()
    ) {
      setOrderMessage("Please complete all customer information.");
      setMessageType("error");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerPhonenumber.trim())) {
      setOrderMessage("Please enter a valid email address.");
      setMessageType("error");
      return;
    }

    setSubmitting(true);
    setOrderMessage("");
    setMessageType("");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerEmail: customerPhonenumber.trim(),
          customerAddress: customerAddress.trim(),
          items: cart.map((item) => ({
            id: item.id,
            quantity: item.quantity,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setOrderMessage(
          result.error || "Order was not saved. Please try again."
        );
        setMessageType("error");
        return;
      }

      setCart([]);
      setCustomerName("");
      setCustomerPhonenumber("");
      setCustomerAddress("");

      setOrderMessage(
        `Order submitted successfully! Order ID: ${result.orderId ?? "Confirmed"}`
      );
      setMessageType("success");
    } catch (error) {
      console.error("Order submission failed:", error);
      setOrderMessage(
        "Unable to submit your order. Please check your connection and try again."
      );
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-800">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5">
          <a href="/" className="text-2xl font-bold text-blue-700">
            Dalina Mini Online Store
          </a>

          <a
            href="#cart"
            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            🛒 Cart ({totalItems})
          </a>
        </div>
      </header>

      {/* Hero section */}
      <section className="bg-gradient-to-r from-blue-700 to-indigo-600 px-5 py-14 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="mb-3 font-semibold uppercase tracking-widest text-blue-100">
            Welcome to our store
          </p>

          <h1 className="mb-4 text-4xl font-extrabold md:text-5xl">
            Find Your Favorite Products
          </h1>

          <p className="max-w-2xl text-lg text-blue-50">
            Discover useful products at great prices. Browse our collection,
            add your favorites to your cart, and place your order online.
          </p>

          <a
            href="#products"
            className="mt-7 inline-block rounded-lg bg-white px-6 py-3 font-bold text-blue-700 transition hover:bg-blue-50"
          >
            Shop Now
          </a>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 lg:grid-cols-3">
        {/* Products */}
        <section id="products" className="lg:col-span-2">
          <div className="mb-6">
            <h2 className="text-3xl font-bold">Our Products</h2>
            <p className="mt-2 text-gray-600">
              Browse products available in our store.
            </p>
          </div>

          {loading ? (
            <div className="rounded-xl bg-white p-10 text-center shadow-sm">
              <p className="text-lg font-medium">Loading products...</p>
              <p className="mt-2 text-sm text-gray-500">
                Please wait while we connect to the store.
              </p>
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
              <p className="text-xl font-semibold">No products available</p>
              <p className="mt-2 text-gray-600">
                Add products to your Supabase products table to display them
                here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  {/* Product image */}
                  <div className="flex h-52 items-center justify-center overflow-hidden bg-gray-100">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="text-center text-gray-400">
                        <span className="text-5xl">📦</span>
                        <p className="mt-2 text-sm">No image available</p>
                      </div>
                    )}
                  </div>

                  {/* Product details */}
                  <div className="p-5">
                    <h3 className="text-xl font-bold">{product.name}</h3>

                    <p className="mt-2 min-h-12 text-sm leading-6 text-gray-600">
                      {product.description || "No description available."}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="text-2xl font-extrabold text-blue-700">
                        ₱{Number(product.price).toLocaleString("en-PH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>

                      <span
                        className={`text-sm font-medium ${
                          product.stock > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {product.stock > 0
                          ? `Stock: ${product.stock}`
                          : "Out of stock"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      disabled={product.stock <= 0}
                      className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                    >
                      {product.stock > 0 ? "Add to Cart" : "Out of Stock"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Shopping cart and checkout */}
        <aside id="cart" className="space-y-6">
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold">Shopping Cart</h2>

            <p className="mt-1 text-sm text-gray-500">
              {totalItems} item{totalItems === 1 ? "" : "s"} in your cart
            </p>

            {cart.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-4xl">🛒</p>
                <p className="mt-3 text-gray-500">
                  Your cart is currently empty.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="border-b border-gray-100 pb-5 last:border-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{item.name}</h3>

                        <p className="mt-1 text-sm text-gray-500">
                          ₱
                          {Number(item.price).toLocaleString("en-PH", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          each
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="text-sm font-medium text-red-600 hover:text-red-800"
                        aria-label={`Remove ${item.name} from cart`}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => decreaseQuantity(item.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 font-bold hover:bg-gray-100"
                          aria-label={`Decrease quantity of ${item.name}`}
                        >
                          −
                        </button>

                        <span className="min-w-5 text-center font-semibold">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() => increaseQuantity(item.id)}
                          disabled={item.quantity >= item.stock}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 font-bold hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Increase quantity of ${item.name}`}
                        >
                          +
                        </button>
                      </div>

                      <span className="font-bold">
                        ₱
                        {(Number(item.price) * item.quantity).toLocaleString(
                          "en-PH",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 flex items-center justify-between border-t border-gray-200 pt-5">
              <span className="text-lg font-bold">Total</span>
              <span className="text-2xl font-extrabold text-blue-700">
                ₱
                {totalPrice.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </section>

          {/* Customer information */}
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold">Checkout</h2>
            <p className="mt-2 text-sm text-gray-500">
              Enter your information to submit your order.
            </p>

            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void submitOrder();
              }}
            >
              <div>
                <label
                  htmlFor="customerName"
                  className="mb-2 block text-sm font-semibold"
                >
                  Full Name
                </label>

                <input
                  id="customerName"
                  type="text"
                  autoComplete="name"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Enter your full name"
                  required
                  maxLength={120}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="customerPhonenumber"
                  className="mb-2 block text-sm font-semibold"
                >
                  Email Address
                </label>

                <input
                  id="customerPhonenumber"
                  type="Phonwnumber"
                  autoComplete="Phonenumber"
                  value={customerPhonenumber}
                  onChange={(event) => setCustomerPhonenumber(event.target.value)}
                  placeholder="Enter your Phone number"
                  required
                  maxLength={254}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="customerAddress"
                  className="mb-2 block text-sm font-semibold"
                >
                  Delivery Address
                </label>

                <textarea
                  id="customerAddress"
                  autoComplete="street-address"
                  value={customerAddress}
                  onChange={(event) => setCustomerAddress(event.target.value)}
                  placeholder="Enter your complete delivery address"
                  required
                  maxLength={500}
                  rows={3}
                  className="w-full resize-y rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {orderMessage && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`rounded-lg p-3 text-sm ${
                    messageType === "success"
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {orderMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || loading || cart.length === 0}
                className="w-full rounded-lg bg-green-600 px-5 py-4 font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {submitting ? "Submitting Order..." : "Place Order"}
              </button>

              <p className="text-center text-xs leading-5 text-gray-500">
                Please check your cart and delivery information before
                submitting your order.
              </p>
            </form>
          </section>
        </aside>
      </div>

      {/* Footer */}
      <footer className="mt-10 bg-gray-900 px-5 py-8 text-center text-gray-300">
        <p className="font-semibold">Dalina Mini Online Store</p>
        <p className="mt-2 text-sm">
          © {new Date().getFullYear()} Dalina Mini Online Store. All rights
          reserved.
        </p>
      </footer>
    </main>
  );
}