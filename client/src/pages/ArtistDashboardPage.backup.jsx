import { useEffect, useState } from " react\;
import { getOwnDashboard } from \../services/artistService\;
import { useAuth } from \../context/AuthContext\;
import { Spinner } from \../components/common/Spinner\;

function ArtistDashboardPage() {
 const { user } = useAuth();
 const [dashboard, setDashboard] = useState(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);

 useEffect(() => {
 if (!user) return;
 getOwnDashboard()
 .then((data) => {
 setDashboard(data.dashboard);
 setLoading(false);
 })
 .catch((err) => {
 console.error(err);
 setError('Failed to load dashboard');
 setLoading(false);
 });
 }, [user]);

 if (!user) {
 return <p className=\error\>You must be signed in as an artist to view this page.</p>;
 }

 if (loading) return <Spinner />;
 if (error) return <p className=\error\>{error}</p>;

 const {
 artistName,
 profileImage,
 verified,
 followerCount,
 totalSongs,
 approvedSongs,
 pendingSongs,
 totalPlays,
 totalLikes,
 genre,
 location,
 } = dashboard;

 return (
 <main className=\dashboard content\>
 <section className=\artist-header glass\>
 <img className=\avatar\ src={profileImage || \/default-avatar.png\} alt={artistName} />
 <div className=\info\>
 <h2>{artistName} {verified && <span className=\badge\>?? Verified</span>}</h2>
 <p>{genre} • {location}</p>
 </div>
 </section>
 <section className=\stats-grid\>
 <div className=\stat-card glass\><h3>{totalSongs}</h3><p>Songs uploaded</p></div>
 <div className=\stat-card glass\><h3>{approvedSongs}</h3><p>Approved</p></div>
 <div className=\stat-card glass\><h3>{pendingSongs}</h3><p>Pending review</p></div>
 <div className=\stat-card glass\><h3>{followerCount}</h3><p>Followers</p></div>
 <div className=\stat-card glass\><h3>{totalPlays}</h3><p>Total Plays</p></div>
 <div className=\stat-card glass\><h3>{totalLikes}</h3><p>Total Likes</p></div>
 </section>
 </main>
 );
}

export default ArtistDashboardPage;
