class Review < ActiveRecord::Base
  attr_accessible :description, :rating, :summary
  belongs_to :product, :counter_cache => :reviews_count
  belongs_to :user

  after_create :up_count_reviews
  after_destroy :down_count_reviews

  def up_count_reviews
     self.product.increment! :reviews_count
  end

  def down_count_reviews
    self.product.decrement! :reviews_count
  end

end
