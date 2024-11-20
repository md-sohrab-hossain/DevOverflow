import Link from "next/link";

const Profile = () => {
  return (
    <div className="text-center font-space-grotesk text-3xl font-black text-fuchsia-500">
      <span>Profile page</span>

      <ul className="mt-6 text-base text-slate-600">
        <li className="text-green-500">
          <Link href="/login">Login</Link>
        </li>
        <li className="text-green-500">
          <Link href="/register">Register</Link>
        </li>
      </ul>
    </div>
  );
};

export default Profile;
