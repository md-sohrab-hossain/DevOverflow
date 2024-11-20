interface ProductDetailsProps {
  params: {
    productId: string;
  };
}

const ProductDetails: React.FC<ProductDetailsProps> = ({ params }) => {
  const { productId } = params;

  return (
    <div className="text-center font-space-grotesk text-3xl font-black text-fuchsia-500">
      ProductDetails of ${productId}
    </div>
  );
};

export default ProductDetails;
