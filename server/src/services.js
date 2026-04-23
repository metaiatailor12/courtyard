const { createSupabaseAdminClient } = require('./supabase');
const { toUtcDateKey } = require('./lib');

async function expireSubscriptions() {
	const supabase = createSupabaseAdminClient();
	const today = toUtcDateKey(new Date());

	const { data: expiredRows, error } = await supabase
		.from('subscriptions')
		.update({ status: 'expired' })
		.eq('status', 'active')
		.lt('end_date', today)
		.select('id');

	if (error) {
		throw error;
	}

	return expiredRows || [];
}

module.exports = {
	expireSubscriptions,
};
