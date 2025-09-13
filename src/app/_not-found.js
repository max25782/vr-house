export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl mb-6">Страница не найдена</p>
        <a href="/" className="text-blue-600 hover:underline">Вернуться на главную</a>
      </div>
    </div>
  );
}

